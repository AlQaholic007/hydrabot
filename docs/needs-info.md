## Hydrabot: Needs Info

[See the playbook](#below)  
🤖 Hydrabot watches for issues in which the author has failed to cater to a maintainer's request to provide for more information. The issue however is re-opened if the intended author does provides more information on the issue at a later stage. The workflow for this is as follows:

- Hydrabot scans for issues that are labeled as `needs-info`
- For issues that were labeled with the label `needs-info` `daysUntilClose` days before, it checks if the author has provided more information.
- If not, it closes the issue with a `closeComment`.
- Hydrabot re-opens this issue once the author has provided the requested information

<details id="below"><summary>🔖 See Playbook</summary>
  <p>

  ```yml
  needsInfo:
    daysUntilClose: 10,
    needsInfoLabel: needs-info
    closeComment: >
      This issue has been automatically closed because there has been no response
      to our request for more information from the original author. With only the
      information that is currently in the issue, we don't have enough information
      to take action. Please reach out if you have or find the answers we need so
      that we can investigate further.
  hydrabot: # your hydrabot validation configuration
  ```
  </p>
</details>