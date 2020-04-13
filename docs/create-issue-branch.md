## Create new branch when issues are assigned

Most organisations have a norm of making changes that concern an issue being resolved to a separate branch. Often, this branch follows a convention based on the organisation.

🤖 Hydrabot lets you automate this for your organisation

A typical workflow for an organisation can be:  
1. A new issue is created
2. The issue is assigned to a contributor
3. Hydrabot listens to your `issue.assigned` event and automatically creates a new branch from a source(by _default_, this is well, the _default_ branch of your repo, generally master)
4. Hydrabot selects a name for the newly created branch based on the configuration specified in `.github/hydrabot.yml` file.

### Configuration

#### Branch names

<details><summary>🔖 See Playbook</summary>
  <p>

  ```yml
  branchName: tiny | short | full
  hydrabot: # your hydrabot validation configuration
  ```
  </p>
</details>

Hydrabot names the newly created branches based on the values specified in `branchName` field of your playbook. The default values come in three different flavors:

- tiny: new branches will be named as 'i${issue.number}' as **i12**
- short: new branches will be named as 'issue-${issue.number}' as **issue-12**
- long: new branches will be named as 'issue-${issue.title}-${issue.title}' as **issue-12-my_issue_title**

You can also use _your own flavors_ to specify the convention that Hydrabot must follow while creating new branches. This is achieved by giving `branchName` a string value where `${...}` placeholders are substituted by values from [this JSON object](https://github.com/AlQaholic007/hydrabot/blob/master/__fixtures__/unit/create-issue-branch/issues.assigned.json)

eg.
```yml
branchName: '${issue.number}-${issue.title}'
```

#### Source branch specification based on labels

By default, Hydrabot uses the "default" branch of the repository, generally `master`, to generate new branches. However this behaviour can be overridden based on issue label.

For example, if your organisation maintains separate `dev` and `staging` branches such that an issue with `enhancement` label should have `dev` branch as source and as issue with `bug` label should have `staging` branch as source. You can specify the source branch as:

<details><summary>🔖 See Playbook</summary>
  <p>

  ```yml
  branches: 
    - label: enhancement
      name: dev
    - label: bug
      name: staging
  branchName: short
  hydrabot: # your hydrabot validation configuration
  ```
  </p>
</details>

In case an issue has multiple label, the first match based on the order in the playbook is used.

#### Prefix based branch names

Hydrabot can also create branches with names which are prefixed based on the labels of an issue

An example would be to have branches for issues with the `enhancement` label to have the `feature/` prefix. This can be specified in your playbook as well:

<details><summary>🔖 See Playbook</summary>
  <p>

  ```yml
  branches: 
    - label: enhancement
      prefix: feature/
    - label: bug
      prefix: bug/
      name: staging
  branchName: short
  hydrabot: # your hydrabot validation configuration
  ```
  </p>
</details>

You can also use `${...}` placeholders here as well to substitute fields from Github's JSON object as

<details><summary>🔖 See Playbook</summary>
  <p>

  ```yml
  branches: 
    - label: enhancement
      name: dev
      prefix: feature/${issue.title}/
  branchName: short
  hydrabot: # your hydrabot validation configuration
  ```
  </p>
</details>

#### Using wildcards

Hydrabot supports wildcards, characters like '?' (matches one instance of a character) and '*' (matches any sequence of characters, including the empty sequence). These are specified within single quotation marks in your playbook

<details><summary>🔖 See Playbook</summary>
  <p>

  ```yml
  branches: 
    - label: enhancement
      name: dev
      prefix: feature/${issue.title}/
    - label: '*'
      prefix: issues/
  branchName: short
  hydrabot: # your hydrabot validation configuration
  ```
  </p>
</details>






