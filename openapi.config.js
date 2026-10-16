import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateService } from '@umijs/openapi'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const apiDir = path.join(__dirname, 'src', 'api')
const typingsPath = path.join(apiDir, 'typings.d.ts')
const bambuMqttApiPath = path.join(apiDir, 'bambuMqtt.ts')
const sseApiPath = path.join(apiDir, 'sse.ts')
const apiIndexPath = path.join(apiDir, 'index.ts')
const preservedApiPaths = [
  path.join(apiDir, 'objectStorage.ts'),
]

function snapshotPreservedFiles() {
  return new Map(
    preservedApiPaths.map((filePath) => [
      filePath,
      fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null,
    ])
  )
}

function restorePreservedFiles(snapshot) {
  for (const [filePath, content] of snapshot) {
    if (content === null) {
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath)
      }
      continue
    }

    fs.writeFileSync(filePath, content)
  }
}

function replaceOrThrow(content, searchValue, replaceValue, label) {
  if (!content.includes(searchValue)) {
    throw new Error(`OpenAPI post-process failed: missing ${label}`)
  }
  return content.replace(searchValue, replaceValue)
}

function patchTypings() {
  if (!fs.existsSync(typingsPath)) {
    return
  }

  let content = fs.readFileSync(typingsPath, 'utf8')

  if (content.includes(`type connectParams = {\n    /** 设备ID */\n    deviceId: string;\n  };`)) {
    content = content.replace(
      `type connectParams = {\n    /** 设备ID */\n    deviceId: string;\n  };`,
      `type bambuMqttConnectParams = {\n    /** 设备ID */\n    deviceId: string;\n  };`
    )
  }

  if (content.includes(`type connectParams = {\n    token: string;\n  };`)) {
    content = content.replace(
      `type connectParams = {\n    token: string;\n  };`,
      `type sseConnectParams = {\n    token: string;\n  };`
    )
  }

  fs.writeFileSync(typingsPath, content)
}

function patchBambuMqttApi() {
  if (!fs.existsSync(bambuMqttApiPath)) {
    return
  }

  let content = fs.readFileSync(bambuMqttApiPath, 'utf8')
  content = replaceOrThrow(
    content,
    'params: API.connectParams,',
    'params: API.bambuMqttConnectParams,',
    'bambu mqtt api connect params reference'
  )
  fs.writeFileSync(bambuMqttApiPath, content)
}

function removeGeneratedSseApi() {
  if (fs.existsSync(sseApiPath)) {
    fs.rmSync(sseApiPath)
  }
}

function patchApiIndex() {
  if (!fs.existsSync(apiIndexPath)) {
    return
  }

  let content = fs.readFileSync(apiIndexPath, 'utf8')
  content = content.replace('import * as sse from "./sse";\n', '')
  content = content.replace('  sse,\n', '')
  fs.writeFileSync(apiIndexPath, content)
}

function postProcessGeneratedFiles(snapshot) {
  restorePreservedFiles(snapshot)
  patchTypings()
  patchBambuMqttApi()
  removeGeneratedSseApi()
  patchApiIndex()
}

const preservedSnapshot = snapshotPreservedFiles()

generateService({
  requestLibPath: "import request from '@/request'",
  schemaPath: 'http://localhost:8123/api/v3/api-docs/default',
  serversPath: './src',
})
  .then(() => {
    postProcessGeneratedFiles(preservedSnapshot)
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
