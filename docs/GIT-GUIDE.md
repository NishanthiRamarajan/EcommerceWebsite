# Git + GitHub quick guide

```bash
# once
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# new project -> GitHub (create an EMPTY private repo on github.com first)
git init
git branch -M main
git add .
git commit -m "chore: initial project structure"
git remote add origin https://github.com/YOUR_USERNAME/online-shopping.git
git push -u origin main

# existing repo on another computer
git clone https://github.com/YOUR_USERNAME/online-shopping.git
git pull                      # get the latest changes
```

## One branch per phase
```bash
git checkout -b phase-3-category-crud     # create + switch
# ...work...
git status                                # what changed?
git add .                                 # stage
git commit -m "feat(category): add category CRUD"
git push -u origin phase-3-category-crud
```
On GitHub: **Compare & pull request > Create pull request > Merge pull request**, then locally:
```bash
git checkout main
git pull
```

## Merge conflicts
A conflict appears when two branches changed the same lines.
```bash
git checkout main
git pull
git merge phase-4-inventory
# CONFLICT in js/common/utils.js
```
Open the file. Git marks the clash:
```
<<<<<<< HEAD          (what is on main)
...
=======
...                   (what is on your branch)
>>>>>>> phase-4-inventory
```
Keep the right code, delete the three marker lines, then:
```bash
git add js/common/utils.js
git commit -m "merge: resolve utils.js conflict"
git push
```
Useful: `git log --oneline`, `git diff`, `git restore <file>` (discard changes), `git stash` / `git stash pop`.
Commit messages: `feat:` new feature, `fix:` bug fix, `docs:` documentation, `chore:` setup. Commit after every working module and push at least once a day.
