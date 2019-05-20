import { Logger } from 'botpress/sdk'
import { spawn } from 'child_process'
import { ConfigProvider } from 'core/config/config-loader'
import { AlertingService } from 'core/services/alerting-service'
import { LangService } from 'core/services/lang-service'
import { MonitoringService } from 'core/services/monitoring'
import { Router } from 'express'
import _ from 'lodash'

import { getDebugScopes, setDebugScopes } from '../../../debug'
import { CustomRouter } from '../customRouter'

export class ServerRouter extends CustomRouter {
  constructor(
    private logger: Logger,
    private monitoringService: MonitoringService,
    private alertingService: AlertingService,
    private configProvider: ConfigProvider,
    private langService: LangService
  ) {
    super('Server', logger, Router({ mergeParams: true }))
    this.setupRoutes()
    this.langService = new LangService(this.logger, this.configProvider)
  }

  setupRoutes() {
    const router = this.router

    router.post(
      '/monitoring',
      this.asyncMiddleware(async (req, res) => {
        const { fromTime, toTime } = req.body
        if (!_.isNumber(fromTime) || !_.isNumber(toTime)) {
          return res.sendStatus(400)
        }

        const config = await this.configProvider.getBotpressConfig()
        if (!_.get(config, 'pro.monitoring.enabled', false)) {
          return res.send(undefined)
        }

        res.send(await this.monitoringService.getStats(fromTime, toTime))
      })
    )

    router.post(
      '/incidents',
      this.asyncMiddleware(async (req, res) => {
        const { fromTime, toTime } = req.body
        if (!_.isNumber(fromTime) || !_.isNumber(toTime)) {
          return res.sendStatus(400)
        }

        const config = await this.configProvider.getBotpressConfig()
        if (!_.get(config, 'pro.alerting.enabled', false)) {
          return res.send(undefined)
        }

        res.send(await this.alertingService.getIncidents(fromTime, toTime))
      })
    )

    router.post(
      '/config/enablePro',
      this.asyncMiddleware(async (req, res) => {
        if (process.IS_PRO_ENABLED) {
          return res.send('Botpress Pro is already enabled.')
        }

        await this.configProvider.mergeBotpressConfig({ pro: { enabled: true } })
        res.send('Enabled successfully')
      })
    )

    router.post(
      '/rebootServer',
      this.asyncMiddleware(async (req, res) => {
        const user = req.tokenUser!.email
        const config = await this.configProvider.getBotpressConfig()

        if (!config.allowServerReboot) {
          this.logger.warn(`User ${user} requested a server reboot, but the feature is disabled.`)
          return res.status(400).send(`Rebooting the server is disabled in the botpress.config.json file`)
        }

        this.logger.info(`User ${user} requested a server reboot`)

        res.sendStatus(200)

        // Timeout is only to allow the response to reach the asking user
        setTimeout(() => {
          spawn(process.argv[0], process.argv.slice(1), {
            detached: true,
            stdio: 'inherit'
          }).unref()

          process.exit()
        }, 100)
      })
    )

    router.get(
      '/debug',
      this.asyncMiddleware(async (req, res) => {
        res.send(getDebugScopes())
      })
    )

    router.post(
      '/debug',
      this.asyncMiddleware(async (req, res) => {
        setDebugScopes(req.body.debugScope)
        res.sendStatus(200)
      })
    )

    router.get(
      '/models',
      this.asyncMiddleware(async (req, res) => {
        res.send({
          metadata: await this.langService.getMetadata(),
          installed: await this.langService.getInstalledModels(),
          active: await this.langService.getActiveModels()
        })
      })
    )

    router.post(
      '/models/:action',
      this.asyncMiddleware(async (req, res) => {
        const action = req.params.action
        const filename = req.body.filename

        if (action === 'download') {
          await this.langService.downloadModel(filename)
        } else if (action === 'delete') {
          await this.langService.deleteModel(filename)
        } else if (action === 'cancel') {
          await this.langService.cancelDownload(filename)
        }

        res.sendStatus(200)
      })
    )
    /*
    router.post(
      '/models/delete',
      this.asyncMiddleware(async (req, res) => {
        res.send(await this.dls.deleteModel(req.body.filename))
      })
    )

    router.post(
      '/models/cancel',
      this.asyncMiddleware(async (req, res) => {
        res.send(await this.dls.deleteModel(req.body.filename))
      })
    )
*/
    router.get(
      '/models/status',
      this.asyncMiddleware(async (req, res) => {
        res.send(this.langService.getStatus())
      })
    )
  }
}
