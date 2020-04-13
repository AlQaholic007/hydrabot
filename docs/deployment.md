## Deploy manager 

Hydrabot automates deployment management for your repositories by letting you trigger deployments based on a label given to a PR.

### How it works?

Hydrabot 🤖 lets you create a deployment on Github by setting a certain label on your pull requests. This deployment generates a webhook that a 3rd party app can then listen to and carry out the deployment for you. Check GitHub's [deployment API](https://developer.github.com/v3/repos/deployments/) for more information.

<details id="below"><summary>🔖 See Playbook</summary>
  <p>

  ```yml
  deploy:
    deploy-to-staging:
      environment: staging
    deploy-to-dev:
      environment: test
      transient_environment: true
      auto_merge: false
      required_contexts:
        - continuous-integration/travis-ci/push
      payload:
        port: 8080
        https: true
  hydrabot: # your hydrabot validation configuration
  ```
  </p>
</details>

- You can use whichever [environment](https://developer.github.com/v3/repos/deployments/#parameters) parameter used by GitHub's deployment API
- Hydrabot fails your deployment if your branch conflicts with master. To deploy a conflicting branch, then set `auto_merge` to `false` in playbook.
- You can configure the `required-contexts` to match to your CI app. Do note however that a failure in these checks will lead to Hydrabot failing a deployment.