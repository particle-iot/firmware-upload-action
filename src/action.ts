import * as core from '@actions/core'
import {HttpClient} from '@actions/http-client'
import fs from 'fs'
import FormData from 'form-data'

function validAccessToken(accessToken: string): boolean {
  return accessToken.length === 40
}

function validProductId(productId: string): boolean {
  return !isNaN(parseInt(productId))
}

function validVersion(firmwareVersion: string): boolean {
  return !isNaN(parseInt(firmwareVersion))
}

function validTitle(title: string): boolean {
  return title.length > 0
}

function validFirmwarePath(firmwarePath: string): boolean {
  return firmwarePath.length > 0
}

export async function uploadFirmware(
  params: FirmwareUploadInputs
): Promise<{title: string; uploaded_by: string}> {
  const {
    accessToken,
    firmwarePath,
    firmwareVersion,
    product,
    title,
    description
  } = params

  const fileContents = fs.readFileSync(firmwarePath)
  const form = new FormData()
  form.append('binary', fileContents, firmwarePath)
  form.append('version', firmwareVersion)
  form.append('title', title)

  if (description) {
    form.append('description', description)
  }

  const url = `https://api.particle.io/v1/products/${product}/firmware`
  const headers = {
    authorization: `Bearer ${accessToken}`,
    accept: 'application/json'
  } as {[id: string]: string}

  headers[
    'content-type'
  ] = `multipart/form-data; boundary=${form.getBoundary()}`

  const data = form.getBuffer().toString('utf-8')
  const http = new HttpClient()
  const response = await http.post(url, data, headers)
  const responseBody = await response.readBody()

  const json = JSON.parse(responseBody)
  if (response.message.statusCode !== 201) {
    throw new Error(`Error uploading firmware: ${json.error}`)
  }

  return {
    title: json.title,
    uploaded_by: json.uploaded_by.username
  }
}

// make interface from inputs
interface FirmwareUploadInputs {
  accessToken: string
  firmwarePath: string
  firmwareVersion: string
  product: string
  title: string
  description: string
}

export async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('particle-access-token', {required: true})
    const firmwarePath = core.getInput('firmware-path', {required: true})
    const firmwareVersion = core.getInput('firmware-version', {required: true})
    const product = core.getInput('product-id', {required: true})
    const title = core.getInput('title', {required: true})
    const description = core.getInput('description', {required: false})

    if (!validAccessToken(accessToken)) {
      throw new Error('invalid access token')
    }

    if (!validProductId(product)) {
      throw new Error('invalid device id')
    }

    if (!validFirmwarePath(firmwarePath)) {
      throw new Error('invalid firmware path')
    }

    if (!validVersion(firmwareVersion)) {
      throw new Error('invalid firmware version')
    }

    if (!validTitle(title)) {
      throw new Error('invalid title')
    }

    core.info(
      `Uploading firmware ${firmwarePath} to product ${product} with version ${firmwareVersion}`
    )

    const {title: uploadedTitle, uploaded_by} = await uploadFirmware({
      accessToken,
      firmwarePath,
      firmwareVersion,
      product,
      title,
      description
    })

    core.info(
      `Firmware uploaded successfully. \nTitle: ${uploadedTitle} \nUploaded by: ${uploaded_by}`
    )
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
