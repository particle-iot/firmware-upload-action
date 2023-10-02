import {FirmwareUploadInputs, run, uploadFirmware} from '../src/action'
import {expect, it, jest} from '@jest/globals'
import * as core from '@actions/core'
import nock from 'nock'

const firmwarePath = '__tests__/fixtures/productFirmware.bin'

const headers = {
  'user-agent': 'particle-firmware-upload-action',
  'x-particle-tool': 'particle-firmware-upload-action',
}

describe('uploadFirmware', () => {
  it('should successfully upload firmware', async () => {
    const firmwareUploadInputs: FirmwareUploadInputs = {
      accessToken: 'test-token',
      firmwarePath,
      firmwareVersion: '1',
      product: 'test-product',
      title: 'Test Firmware',
      description: 'Test firmware description'
    }

    const scope = nock('https://api.particle.io', {
        reqheaders: headers
      })
      .post(`/v1/products/${firmwareUploadInputs.product}/firmware`)
      .reply(201, {
        title: 'Test Firmware',
        uploaded_by: {username: 'testuser'}
      })

    const result = await uploadFirmware(firmwareUploadInputs)

    expect(result).toEqual({
      title: 'Test Firmware',
      uploaded_by: 'testuser'
    })
    expect(scope.isDone()).toBe(true)
  })

  it('should throw an error when the API call fails', async () => {
    const firmwareUploadInputs: FirmwareUploadInputs = {
      accessToken: 'test-token',
      firmwarePath,
      firmwareVersion: '1',
      product: 'test-product',
      title: 'Test Firmware',
      description: 'Test firmware description'
    }

    // Mock the API call to return a 400 error for duplicate firmware version
    const scope = nock('https://api.particle.io', {
      reqheaders: headers
      })
      .post(`/v1/products/${firmwareUploadInputs.product}/firmware`)
      .reply(400, {
        error_description: 'Firmware version already exists',
        error: 'invalid_request'
      })

    await expect(uploadFirmware(firmwareUploadInputs)).rejects.toThrow(
      'Error uploading firmware: {"error_description":"Firmware version already exists","error":"invalid_request"} (status code 400)'
    )
    expect(scope.isDone()).toBe(true)
  })
})

describe('run', () => {
  it('should validate inputs and upload firmware successfully upload', async () => {
    process.env['INPUT_PARTICLE-ACCESS-TOKEN'] = 'abcde'.repeat(8)
    process.env['INPUT_FIRMWARE-PATH'] = firmwarePath
    process.env['INPUT_FIRMWARE-VERSION'] = '1'
    process.env['INPUT_PRODUCT-ID'] = '201'
    process.env['INPUT_TITLE'] = 'Test Firmware'

    const scope = nock('https://api.particle.io')
      .post(`/v1/products/201/firmware`)
      .reply(201, {
        title: 'Test Firmware',
        uploaded_by: {username: 'testuser'}
      })

    jest.spyOn(core, 'setFailed')
    await run()
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(scope.isDone()).toBe(true)
  })

  it('should fail with firmware-path not set', async () => {
    process.env['INPUT_PARTICLE-ACCESS-TOKEN'] = 'abcde'.repeat(8)
    process.env['INPUT_FIRMWARE-PATH'] = ''
    process.env['INPUT_FIRMWARE-VERSION'] = '1'
    process.env['INPUT_PRODUCT-ID'] = '400'
    process.env['INPUT_TITLE'] = 'smthng'

    jest.spyOn(core, 'setFailed')
    await run()
    expect(core.setFailed).toHaveBeenCalledWith(
      'Input required and not supplied: firmware-path'
    )
  })

  it('should fail with empty product id', async () => {
    process.env['INPUT_PARTICLE-ACCESS-TOKEN'] = 'abcde'.repeat(8)
    process.env['INPUT_FIRMWARE-PATH'] = firmwarePath
    process.env['INPUT_FIRMWARE-VERSION'] = '1'
    process.env['INPUT_PRODUCT-ID'] = ''
    process.env['INPUT_TITLE'] = 'smthng'

    jest.spyOn(core, 'setFailed')
    await run()
    expect(core.setFailed).toHaveBeenCalledWith(
      'Input required and not supplied: product-id'
    )
  })
})
