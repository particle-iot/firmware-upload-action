import { run, uploadFirmware } from "../src/action";
import {expect, test, jest} from '@jest/globals'
import * as core from '@actions/core'
import {HttpClient, HttpClientResponse} from '@actions/http-client'
import * as http from 'http'
import * as net from 'net'

jest.mock('@actions/http-client')

async function emptyMockReadBody(): Promise<string> {
  return new Promise(resolve => {
    resolve('')
  })
}

beforeAll(() => {
  jest
    .spyOn(HttpClient.prototype, 'post')
    .mockImplementation(async (url, form, headers) => {
      const mockMessage = new http.IncomingMessage(new net.Socket())
      let mockReadBody = emptyMockReadBody
      let response = {};

      // Look at the url and return the appropriate response for the tests
      if (url === 'https://api.particle.io/v1/products/400/firmware') {
        mockMessage.statusCode = 400
        response = {
          ok: false,
          error: "Firmware version already exists."
        }
      } else {
        mockMessage.statusCode = 201
        response = {
          ok: true,
          title: 'some title',
          uploaded_by: {
            username: 'some username'
          }
        }
      }

      const returnData: string = JSON.stringify(response, null, 2)
      mockReadBody = async function (): Promise<string> {
        return new Promise(resolve => {
          resolve(returnData)
        })
      }
      return new Promise<HttpClientResponse>(resolve => {
        resolve({
          message: mockMessage,
          readBody: mockReadBody
        })
      })
    })
})

describe('uploadFirmware', () => {

  it('should fail when the firmware version already exists in the product', async () => {
    const params = {
      accessToken: 'abcde'.repeat(8),
      firmwarePath: '__tests__/fixtures/productFirmware.bin',
      firmwareVersion: '1',
      product: '400', // this test product has a firmware version 1 already
      title: 'title',
      description: 'smthng'
    }

    await expect(uploadFirmware(params)).rejects.toThrow('Error uploading firmware: Firmware version already exists.')
  })

  it('should upload firmware successfully', async () => {
    const params = {
      accessToken: 'abcde'.repeat(8),
      firmwarePath: '__tests__/fixtures/productFirmware.bin',
      firmwareVersion: '1',
      product: '201',
      title: 'title',
      description: 'smthng'
    }
    const result = await uploadFirmware(params)
    expect(result).toEqual({
      title: 'some title',
      uploaded_by: 'some username'
    });
  })
})

describe('run', () => {

  it('should validate inputs and upload firmware successfully upload', async () => {
    process.env['INPUT_ACCESS-TOKEN'] = 'abcde'.repeat(8)
    process.env['INPUT_FIRMWARE-PATH'] = '__tests__/fixtures/productFirmware.bin'
    process.env['INPUT_FIRMWARE-VERSION'] = '1'
    process.env['INPUT_PRODUCT-ID'] = '201'
    process.env['INPUT_TITLE'] = 'smthng'

    jest.spyOn(core, 'setFailed')
    const result = await run()
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should fail with firmware-path not set', async () => {
    process.env['INPUT_ACCESS-TOKEN'] = 'abcde'.repeat(8)
    process.env['INPUT_FIRMWARE-PATH'] = ''
    process.env['INPUT_FIRMWARE-VERSION'] = '1'
    process.env['INPUT_PRODUCT-ID'] = '400'
    process.env['INPUT_TITLE'] = 'smthng'

    jest.spyOn(core, 'setFailed')
    const result = await run()
    expect(core.setFailed).toHaveBeenCalledWith(
      'Input required and not supplied: firmware-path'
    )
  })

  it('should fail with empty product id', async () => {
    process.env['INPUT_ACCESS-TOKEN'] = 'abcde'.repeat(8)
    process.env['INPUT_FIRMWARE-PATH'] = 'firmware.bin'
    process.env['INPUT_FIRMWARE-VERSION'] = '1'
    process.env['INPUT_PRODUCT-ID'] = ''
    process.env['INPUT_TITLE'] = 'smthng'

    jest.spyOn(core, 'setFailed')
    const result = await run()
    expect(core.setFailed).toHaveBeenCalledWith(
      'Input required and not supplied: product-id'
    )
  })

})
