class NoResponse {
  constructor (context, config, logger) {
    this.context = context
    this.github = context.github
    this.config = config
    this.logger = logger
  }

  async sweep () {
    this.logger.debug('Starting sweep')

    await this.ensureLabelExists(this.context.repo({name: this.config.needsInfoLabel, color: this.config.needsInfoColor}))

    const issues = await this.getClosableIssues()
    issues.forEach(issue => this.close(this.context.repo({number: issue.number})))
  }

  async unmark (issue) {
    const {perform, needsInfoLabel} = this.config
    const {owner, repo, number} = issue
    const comment = this.context.payload.comment

    const issueInfo = await this.github.issues.get(issue)

    const isMarked = await this.hasNeedsInfoLabel(issue)
    if (isMarked && issueInfo.data.user.login === comment.user.login) {
      if (perform) {
        this.logger.info('%s/%s#%d is being unmarked', owner, repo, number)
        await this.github.issues.removeLabel({owner, repo, number, name: needsInfoLabel})
        if (issueInfo.data.state === 'closed' && issueInfo.data.user.login !== issueInfo.data.closed_by.login) {
          this.github.issues.edit({owner, repo, number, state: 'open'})
        }
      } else {
        this.logger.info('%s/%s#%d would have been unmarked (dry-run)', owner, repo, number)
      }
    }
  }

  async close (issue) {
    const {closeComment, perform} = this.config

    if (perform) {
      this.logger.info('%s/%s#%d is being closed', issue.owner, issue.repo, issue.number)
      if (closeComment) {
        await this.github.issues.createComment(Object.assign({}, issue, {body: closeComment}))
      }
      return this.github.issues.edit(Object.assign({}, issue, {state: 'closed'}))
    } else {
      this.logger.info('%s/%s#%d would have been closed (dry-run)', issue.owner, issue.repo, issue.number)
    }
  }

  async ensureLabelExists ({name, color}) {
    return this.github.issues.getLabel(this.context.repo({name})).catch(() => {
      return this.github.issues.createLabel(this.context.repo({name, color}))
    })
  }

  // async findLastLabeledEvent (owner, repo, number) {
  //   const {needsInfoLabel} = this.config
  //   const params = {owner, repo, issue_number: number, per_page: 100}
  //   const events = await this.github.paginate(this.github.issues.getEvents(params))
  //   return events[0].data.reverse()
  //                .find(event => event.event === 'labeled' && event.label.name === needsInfoLabel);
  // }

  async findLastLabeledEvent ({ owner, repo, number }) {
    const { needsInfoLabel } = this.config
    const params = { owner, repo, issue_number: number, per_page: 100 }
    const events = await this.github.paginate(this.github.issues.getEvents(params))
    return events.reverse().find(event => event.event === 'labeled' && event.label.name === needsInfoLabel)
  }

  async getClosableIssues () {
    const {owner, repo} = this.context.repo()
    const {daysUntilClose, needsInfoLabel} = this.config
    const q = `repo:${owner}/${repo} is:issue is:open label:"${needsInfoLabel}"`
    const params = {q, sort: 'updated', order: 'desc', per_page: 50}
    const labeledEarlierThan = this.since(daysUntilClose)

    const issues = await this.github.search.issues(params)
    return issues.data.items.filter(async issue => {
      const event = await this.findLastLabeledEvent(issue)
      if (event.created_at < labeledEarlierThan) {
        const creationDate = new Date(event.created_at)
        return creationDate < labeledEarlierThan
      }
    })
  }

  async hasNeedsInfoLabel (issue) {
    const labels = await this.github.issues.listLabelsOnIssue(issue)

    return labels.data.map(label => label.name).includes(this.config.needsInfoLabel)
  }

  since (days) {
    const ttl = days * 24 * 60 * 60 * 1000
    return new Date(new Date() - ttl)
  }
}

module.exports = {
  NoResponse,
  defaults: {
    daysUntilClose: 14,
    perform: !process.env.DRY_RUN,
    needsInfoLabel: 'needs-info',
    needsInfoColor: 'ffffff',
    closeComment:
      'This issue has been automatically closed because it requires more information' +
      ' from the original author to take action.' +
      ' Please reach out if you have or find the answers we need so' +
      ' that we can investigate further.'
  }
}
