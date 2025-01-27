# Particle Firmware Upload Action
[![Build and Test](https://github.com/particle-iot/firmware-upload-action/actions/workflows/test.yml/badge.svg)](https://github.com/particle-iot/firmware-upload-action/actions/workflows/test.yml)

A GitHub Action for uploading firmware binaries to Particle products.

This action does not trigger OTA updates to devices. It only uploads the binary to the Particle cloud.

Other Actions for firmware development: [Compile](https://github.com/particle-iot/compile-action) | [Flash Device](https://github.com/particle-iot/flash-device-action) | Firmware Upload

## Usage

```yaml
- uses: particle-iot/firmware-upload-action@v1
  with:
    # Particle access token
    # Required: true
    particle-access-token: ''
    
    # Path to the firmware binary to upload
    # Required: true
    firmware-path: ''
    
    # Firmware version
    # The version number of the firmware binary you are uploading
    # Required: true
    firmware-version: ''

    # Product ID or slug
    # Required: true
    product-id: ''

    # Title of the firmware version
    # Required: true
    title: ''
    
    # Description
    # Optionally provide a description for the new firmware version
    # Required: false
    description: ''
```

Also see official [Particle documentation](https://docs.particle.io/firmware/best-practices/github-actions/) for more details.

## Example Pipeline

This is an example of a GitHub Actions pipeline that compiles a firmware project and uploads the compiled binary as an artifact.

You will need to create a GitHub secret named `PARTICLE_ACCESS_TOKEN` with a Particle API access token.
The access token should be an [API User](https://docs.particle.io/getting-started/cloud/cloud-api/#api-users) token.
It needs the `firmware:create` scope to be able to upload firmware binaries.
If you intend reuse the token to flash firmware to test devices, it will also need the `devices:update` scope.

```yaml
name: Compile and Release

# This workflow runs on git tags
# It will only run when a tag is pushed to the repository that matches the pattern "v*"
on:
  push:
    tags:
      - 'v*'

jobs:
  compile-release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Compile application
        id: compile
        uses: particle-iot/compile-action@v1
        with:
          particle-platform-name: 'boron'
          device-os-version: 'latest-lts'

      - name: Upload artifacts to GitHub
        uses: actions/upload-artifact@v4
        with:
          path: |
            ${{ steps.compile.outputs.firmware-path }}
            ${{ steps.compile.outputs.target-path }}

      - name: Create archive of target directory
        run: |
          tar -czf debug-objects.tar.gz ${{ steps.compile.outputs.target-path }}
            
      - name: Create GitHub release
        id: release
        uses: ncipollo/release-action@v1
        with:
          artifacts: ${{ steps.compile.outputs.firmware-path }},debug-objects.tar.gz
          generateReleaseNotes: 'true'
          name: 'Firmware v${{ steps.compile.outputs.firmware-version }}'
          tag: 'v${{ steps.compile.outputs.firmware-version }}'
          commit: ${{ github.sha }}
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload product firmware to Particle
        uses: particle-iot/firmware-upload-action@v1
        with:
          particle-access-token: ${{ secrets.PARTICLE_ACCESS_TOKEN }}
          firmware-path: ${{ steps.compile.outputs.firmware-path }}
          firmware-version: ${{ steps.compile.outputs.firmware-version }}
          product-id: '<product-id>'
          title: 'Firmware v${{ steps.compile.outputs.firmware-version }}'
          description: '[Firmware v${{ steps.compile.outputs.firmware-version }} GitHub Release](${{ steps.release.outputs.html_url }})'
```
