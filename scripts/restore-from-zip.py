#!/usr/bin/env python3
"""Restore the verified First Contact ZIP into the existing GitHub repository.
Uses only Python's standard library and Git. Run with an optional ZIP path.
The original build files are imported byte-for-byte; main is never force-pushed.
"""
import hashlib
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import tempfile
import zipfile

REPO = "https://github.com/cagrikacmaz/first-contact-ai-experiment.git"
BASE = "688ccb988cc8bcd50532f9ba0de3a0222e264dd9"
TEST_HEAD = "7c1c1e815b4cd4d158699746d87624c110587ccd"
HELPER = "scripts/restore-from-zip.py"
OLD_FILES = [
    "assets/editorial/hero-four-models-four-worlds.webp",
    "assets/creator-notes-collage.webp",
    "assets/encounters-collage.webp",
    "builds/astra-stillwater.zip",
    "builds/fable-salt-flat.zip",
    "builds/gemini-chime-caldera.zip",
    "builds/opus-pilgrim.zip",
]
REQUIRED = [
    "README.md", "PROMPT.md", "METHODOLOGY.md", "RESULTS.md",
    "assets/editorial/hero-four-models-four-worlds.png",
    "builds/astra-stillwater/dist/index.html",
    "builds/fable-salt-flat/public/index.html",
    "builds/gemini-chime-caldera/src/main.js",
    "builds/opus-pilgrim/index.html",
]

def git(*args, cwd=None, capture=True):
    result = subprocess.run(
        ["git", *args], cwd=cwd, text=True, encoding="utf-8",
        stdout=subprocess.PIPE if capture else None, check=True,
    )
    return result.stdout.strip() if capture else ""

def choose_zip():
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).expanduser().resolve()
    try:
        import tkinter
        from tkinter import filedialog
        window = tkinter.Tk()
        window.withdraw()
        window.attributes("-topmost", True)
        selected = filedialog.askopenfilename(
            title="Select first-contact-ai-experiment(1).zip",
            filetypes=[("ZIP archive", "*.zip")],
        )
        window.destroy()
        if not selected:
            raise RuntimeError("No ZIP selected. Nothing was changed.")
        return Path(selected).resolve()
    except ImportError:
        return Path(input("ZIP file path: ").strip().strip('"')).expanduser().resolve()

def read_package(zip_path):
    files = {}
    with zipfile.ZipFile(zip_path) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("ZIP integrity check failed.")
        for entry in archive.infolist():
            if entry.is_dir():
                continue
            path = PurePosixPath(entry.filename)
            if (path.is_absolute() or ".." in path.parts or
                "\\" in entry.filename or ":" in entry.filename or
                path.parts[0] != "first-contact-ai-experiment" or
                ".git" in path.parts or
                ((entry.external_attr >> 16) & 0o170000) == 0o120000):
                raise RuntimeError("Unsafe or unexpected ZIP path: " + entry.filename)
            relative = path.relative_to("first-contact-ai-experiment").as_posix()
            if relative.casefold() in {name.casefold() for name in files}:
                raise RuntimeError("Duplicate ZIP path: " + relative)
            files[relative] = archive.read(entry)
    if len(files) != 110 or any(name not in files for name in REQUIRED):
        raise RuntimeError("This is not the expected complete 110-file package.")
    for name, data in files.items():
        if name.endswith(".png") and not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise RuntimeError("Invalid PNG signature: " + name)
    return files

def blob_sha(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()

def check_tree(repo_dir, ref, files):
    actual = {}
    for record in git("ls-tree", "-rz", ref, cwd=repo_dir).split("\0"):
        if record:
            metadata, name = record.split("\t", 1)
            actual[name] = metadata.split()[2]
    bad = [name for name, data in files.items() if actual.get(name) != blob_sha(data)]
    if bad or any(name in actual for name in OLD_FILES):
        raise RuntimeError("Repository content verification failed: " + ", ".join(bad[:5]))

def main():
    if shutil.which("git") is None:
        raise RuntimeError("Git is required. Install Git for Windows, then rerun.")
    zip_path = choose_zip()
    files = read_package(zip_path)
    print("Verified ZIP: 110 files. Original sources and images will be preserved.")

    task_dir = Path(tempfile.mkdtemp(prefix="first-contact-recovery-"))
    repo_dir = task_dir / "repository"
    print("Working copy:", repo_dir)
    git("clone", "--branch", "main", REPO, str(repo_dir), capture=False)
    # Preserve the archive bytes even on Windows with global autocrlf enabled.
    git("config", "core.autocrlf", "false", cwd=repo_dir)
    git("config", "core.safecrlf", "false", cwd=repo_dir)
    head = git("rev-parse", "HEAD", cwd=repo_dir)

    # Refuse to overwrite unrelated work made since the diagnosed broken import.
    changed = set(git("diff", "--name-only", BASE, head, cwd=repo_dir).splitlines())
    if changed - {HELPER}:
        raise RuntimeError(
            "Main has other changes since the diagnosed import. Nothing was pushed. "
            "Ask for a fresh repository check; keep this working copy."
        )

    # Supply identity only for this temporary clone if Git has no configured identity.
    for key, fallback in (
        ("user.name", "Cagri Kacmaz"),
        ("user.email", "19714227+cagrikacmaz@users.noreply.github.com"),
    ):
        probe = subprocess.run(["git", "config", "--get", key], cwd=repo_dir,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if probe.returncode != 0:
            git("config", key, fallback, cwd=repo_dir)

    refs = git("ls-remote", "--heads", "origin", "binary-test", cwd=repo_dir)
    cleanup_test = bool(refs and refs.split()[0] == TEST_HEAD)
    if cleanup_test:
        # Preserve the old test commit as a merge parent before deleting its branch.
        git("merge", "--no-commit", "--no-ff", "-s", "ours",
            TEST_HEAD, cwd=repo_dir, capture=False)

    for name in OLD_FILES:
        path = repo_dir / name
        if path.is_file():
            path.unlink()
    for name, data in files.items():
        path = repo_dir / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    git("add", "-A", cwd=repo_dir)
    # Delivered dist files may be ignored by the builders' original .gitignore.
    names = sorted(files)
    for start in range(0, len(names), 40):
        git("add", "-f", "--", *names[start:start + 40], cwd=repo_dir)
    tree = git("write-tree", cwd=repo_dir)
    check_tree(repo_dir, tree, files)
    git("diff", "--cached", "--stat", cwd=repo_dir, capture=False)
    git("commit", "-m",
        "Restore complete original builds, PNG galleries and experiment documentation",
        cwd=repo_dir, capture=False)
    commit = git("rev-parse", "HEAD", cwd=repo_dir)

    # A concurrent main update rejects this normal push; history is never rewritten.
    git("push", "origin", "HEAD:refs/heads/main", cwd=repo_dir, capture=False)
    remote_main = git("ls-remote", "--heads", "origin", "main", cwd=repo_dir).split()[0]
    if remote_main != commit:
        raise RuntimeError("Remote main changed during verification. Test branch was retained.")
    git("fetch", "origin", "main", cwd=repo_dir)
    check_tree(repo_dir, "origin/main", files)
    print("SUCCESS: all 110 original files verified on main.")
    print("Commit: https://github.com/cagrikacmaz/first-contact-ai-experiment/commit/" + commit)

    if cleanup_test:
        try:
            # Delete only the exact diagnosed test ref; retain it if someone updated it.
            git("push", "--force-with-lease=refs/heads/binary-test:" + TEST_HEAD,
                "origin", ":refs/heads/binary-test", cwd=repo_dir, capture=False)
            remaining = git("ls-remote", "--heads", "origin", "binary-test", cwd=repo_dir)
            if remaining:
                print("Main is repaired; binary-test still exists. Review it separately.")
            else:
                print("Removed binary-test; its history is preserved in the merge commit.")
        except subprocess.CalledProcessError:
            print("Main is repaired. Test-branch cleanup failed or its ref changed; it was retained.")
    elif refs:
        print("binary-test has changed; it was retained for review.")
    print("Working copy retained at:", repo_dir)

if __name__ == "__main__":
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print("\nSTOPPED:", error, file=sys.stderr)
        print("No force-push or repository deletion was performed.", file=sys.stderr)
        sys.exit(1)
