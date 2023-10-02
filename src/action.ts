import * as core from '@actions/core'
import fs from 'fs'
import FormData from 'form-data'
import got from 'got'

function validAccessToken(accessToken: string): boolean {
  return accessToken.length === 40
}

function validProductId(productId: string): boolean {
  return productId.length > 0
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

  const form = new FormData()
  const filename = firmwarePath.split('/').pop() || 'firmware.bin'
  form.append('binary', fs.createReadStream(firmwarePath), {
    filename,
    contentType: 'application/octet-stream'
  })
  form.append('version', firmwareVersion)
  form.append('title', title)
  form.append('description', description)

  const headers = {
    ...form.getHeaders(),
    authorization: `Bearer ${accessToken}`,
    accept: 'application/json',
    'user-agent': 'particle-firmware-upload-action',
    'x-particle-tool': 'particle-firmware-upload-action',
    'x-api-version': '1.2.0'
  }

  const url = `https://api.particle.io/v1/products/${product}/firmware`
  try {
    const res = await got.post(url, {
      body: form,
      headers
    })
    const body = JSON.parse(res.body)
    return {
      title: body.title,
      uploaded_by: body.uploaded_by.username
    }
  } catch (error) {
    if (error instanceof got.HTTPError) {
      throw new Error(
        `Error uploading firmware: ${error.response.body} (status code ${error.response.statusCode})`
      )
    } else {
      throw new Error(`Error uploading firmware: ${error}`)
    }
  }
}

// make interface from inputs
export interface FirmwareUploadInputs {
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
      throw new Error('invalid product id')
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
