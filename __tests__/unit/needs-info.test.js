const {NoResponse} = require('../../lib/needs-info/needs-info')

describe('NoResponse', function () {
  let config
  let context
  let github
  let logger
  let repository

  beforeEach(function () {
    config = {
      needsInfoLabel: 'needs-info',
      needsInfoColor: 'ffffff'
    }

    logger = {
      debug: jest.fn(),
      info: jest.fn()
    }

    repository = {
      owner: 'probot',
      repo: 'testing-things'
    }
  })

  describe('sweep', function () {
    beforeEach(function () {
      github = {
        issues: {
          createComment: jest.fn(),
          createLabel: jest.fn(),
          edit: jest.fn().mockReturnValue(Promise.resolve()),
          getLabel: jest.fn().mockReturnValue(Promise.resolve()),
          lstLabelsOnIssue: jest.fn().mockReturnValue(Promise.resolve())
        },
        search: {
          issues: jest.fn().mockReturnValue(Promise.resolve({data: {items: []}}))
        }
      }

      context = {
        github,
        repo: (params) => { return Object.assign({}, repository, params) }
      }
    })

    test('creates a needsInfoLabel if one does not exist', async function () {
      github.issues.getLabel = jest.fn().mockReturnValue(Promise.reject(new Error()))

      const noResponse = new NoResponse(context, config, logger)

      await noResponse.sweep()

      expect(github.issues.getLabel).toHaveBeenCalled()
      expect(github.issues.getLabel).toBeCalledWith({
        owner: 'probot',
        repo: 'testing-things',
        name: 'needs-info'
      })
      expect(github.issues.createLabel).toHaveBeenCalled()
      expect(github.issues.createLabel).toBeCalledWith({
        owner: 'probot',
        repo: 'testing-things',
        name: 'needs-info',
        color: 'ffffff'
      })
    })

    test('does not create a needsInfoLabel if it already exists', async function () {
      const noResponse = new NoResponse(context, config, logger)

      await noResponse.sweep()

      expect(github.issues.getLabel).toHaveBeenCalled()
      expect(github.issues.getLabel).toBeCalledWith({
        owner: 'probot',
        repo: 'testing-things',
        name: 'needs-info'
      })
      expect(github.issues.createLabel).not.toHaveBeenCalled()
    })

    test('searches for matching issues', async function () {
      const noResponse = new NoResponse(context, config, logger)

      await noResponse.sweep()

      expect(github.search.issues).toHaveBeenCalled()
      expect(github.search.issues).toBeCalledWith({
        order: 'desc',
        q: 'repo:probot/testing-things is:issue is:open label:"needs-info"',
        sort: 'updated',
        per_page: 50
      })
    })
  })

  describe('close', function () {
    let noResponse

    beforeEach(function () {
      github = {
        issues: {
          createComment: jest.fn(),
          createLabel: jest.fn(),
          edit: jest.fn().mockReturnValue(Promise.resolve()),
          getLabel: jest.fn().mockReturnValue(Promise.resolve())
        },
        paginate: jest.fn().mockReturnValue(Promise.resolve([])),
        search: {
          issues: jest.fn()
        }
      }

      context = {
        github,
        repo: (params) => { return Object.assign({}, repository, params) }
      }
    })

    describe('when perform is set to false', function () {
      beforeEach(async function () {
        noResponse = new NoResponse(context, {perform: false}, logger)
        await noResponse.close(context.repo({number: 1234}))
      })

      test('logs that this is a dry run', function () {
        expect(logger.info).toHaveBeenCalled()
        expect(logger.info.mock.calls[0][0]).toMatch(/dry-run/)
      })

      test('does not close the issue', function () {
        expect(github.issues.edit).not.toHaveBeenCalled()
      })

      test('does not post a comment', function () {
        expect(github.issues.createComment).not.toHaveBeenCalled()
      })
    })

    describe('when perform is set to true and there is no close comment', function () {
      beforeEach(async function () {
        noResponse = new NoResponse(context, {closeComment: null, perform: true}, logger)
        await noResponse.close(context.repo({number: 1234}))
      })

      test('logs that the issue is being closed', function () {
        expect(logger.info).toHaveBeenCalled()
        expect(logger.info.mock.calls[0][0]).toMatch(/is being closed/)
      })

      test('closes the issue', function () {
        expect(github.issues.edit).toHaveBeenCalled()
        expect(github.issues.edit.mock.calls[0][0]).toMatchObject({state: 'closed'})
      })

      test('does not post a comment', function () {
        expect(github.issues.createComment).not.toHaveBeenCalled()
      })
    })

    describe('when perform is set to true and a close comment is included', function () {
      let noResponse

      beforeEach(function () {
        noResponse = new NoResponse(context, {closeComment: 'foo', perform: true}, logger)
      })

      test('logs that the issue is being closed', async function () {
        await noResponse.close(context.repo({number: 1234}))
        expect(logger.info).toHaveBeenCalled()
        expect(logger.info.mock.calls[0][0]).toMatch(/is being closed/)
      })

      test('posts a comment', async function () {
        await noResponse.close(context.repo({number: 1234}))
        expect(github.issues.createComment).toHaveBeenCalled()
        expect(github.issues.createComment.mock.calls[0][0]).toMatchObject({body: 'foo'})
      })

      test('closes the issue if the comment posted successfully', async function () {
        await noResponse.close(context.repo({number: 1234}))
        expect(github.issues.edit).toHaveBeenCalled()
        expect(github.issues.edit.mock.calls[0][0]).toMatchObject({state: 'closed'})
      })

      test('does not close the issue if posting the comment failed', async function () {
        github.issues.createComment = jest.fn().mockReturnValue(Promise.reject(new Error()))

        try {
          await noResponse.close(context.repo({number: 1234}))
        } catch (e) {}

        expect(github.issues.edit).not.toHaveBeenCalled()
      })
    })
  })

  describe('unmark', function () {
    let issueProperties
    let noResponse

    beforeEach(function () {
      issueProperties = {
        state: 'open',
        closed_by: null,
        user: {
          login: 'some-issue-author'
        },
        labels: [
          { name: 'needs-info' }
        ]
      }

      github = {
        issues: {
          edit: jest.fn(),
          get: () => {
            return Promise.resolve({
              data: {
                state: issueProperties.state,
                user: issueProperties.user,
                closed_by: issueProperties.closed_by
              }
            })
          },
          listLabelsOnIssue: () => {
            return Promise.resolve({
              data: issueProperties.labels
            })
          },
          removeLabel: jest.fn()
        }
      }

      context = {
        github,
        payload: {
          issue: {
            number: 1234,
            owner: repository.owner,
            repo: repository.repo
          },
          comment: {
            user: {}
          }
        }
      }
    })

    describe('when perform is set to false', function () {
      beforeEach(function () {
        config.perform = false
        noResponse = new NoResponse(context, config, logger)
      })

      describe('when the issue has the response required label and the commenter is the issue author', function () {
        beforeEach(function () {
          context.payload.comment.user.login = 'some-issue-author'
        })

        test('logs that this is a dry run', async function () {
          await noResponse.unmark(context.payload.issue)
          expect(logger.info).toHaveBeenCalled()
          expect(logger.info.mock.calls[0][0]).toMatch(/dry-run/)
        })

        test('does not remove the label', async function () {
          await noResponse.unmark(context.payload.issue)
          expect(github.issues.removeLabel).not.toHaveBeenCalled()
        })
      })
    })

    describe('when perform is set to true', function () {
      beforeEach(function () {
        config.perform = true
        noResponse = new NoResponse(context, config, logger)
      })

      describe('when the issue has the response required label and the commenter is the issue author', function () {
        beforeEach(function () {
          context.payload.comment.user.login = 'some-issue-author'
        })

        test('logs that the label is being removed', async function () {
          await noResponse.unmark(context.payload.issue)
          expect(logger.info).toHaveBeenCalled()
          expect(logger.info.mock.calls[0][0]).toMatch(/is being unmarked/)
        })

        test('removes the label', async function () {
          await noResponse.unmark(context.payload.issue)
          expect(github.issues.removeLabel).toHaveBeenCalled()
          expect(github.issues.removeLabel.mock.calls[0][0]).toMatchObject({
            owner: 'probot',
            repo: 'testing-things',
            number: 1234,
            name: 'needs-info'
          })
        })

        describe('when the issue is closed by someone other than the issue author', function () {
          test('reopens the issue', async function () {
            issueProperties.state = 'closed'
            issueProperties.closed_by = { login: 'some-other-user' }

            await noResponse.unmark(context.payload.issue)
            expect(github.issues.edit).toHaveBeenCalled()
            expect(github.issues.edit.mock.calls[0][0]).toMatchObject({
              owner: 'probot',
              repo: 'testing-things',
              number: 1234,
              state: 'open'
            })
          })
        })

        describe('when the issue is closed by the issue author', function () {
          test('leaves the issue closed', async function () {
            issueProperties.state = 'closed'
            issueProperties.closed_by = { login: 'some-issue-author' }

            await noResponse.unmark(context.payload.issue)
            expect(github.issues.edit).not.toHaveBeenCalled()
          })
        })

        describe('when the issue is open', function () {
          test('leaves the issue open', async function () {
            issueProperties.state = 'open'

            await noResponse.unmark(context.payload.issue)
            expect(github.issues.edit).not.toHaveBeenCalled()
          })
        })
      })

      describe('when the issue has the response required label and the commenter is NOT the issue author', function () {
        beforeEach(function () {
          context.payload.comment.user.login = 'some-issue-commenter'
        })

        test('does not alter the issue', async function () {
          await noResponse.unmark(context.payload.issue)
          expect(github.issues.edit).not.toHaveBeenCalled()
          expect(github.issues.removeLabel).not.toHaveBeenCalled()
        })
      })

      describe('when the issue does NOT have the response required label and the commenter is the issue author', function () {
        beforeEach(function () {
          issueProperties.labels = [
            { name: 'some-other-label' }
          ]
          context.payload.comment.user.login = 'some-issue-author'
        })

        test('does not alter the issue', async function () {
          await noResponse.unmark(context.payload.issue)
          expect(github.issues.edit).not.toHaveBeenCalled()
          expect(github.issues.removeLabel).not.toHaveBeenCalled()
        })
      })
    })
  })
})
