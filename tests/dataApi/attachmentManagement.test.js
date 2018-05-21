'use strict'

jest.mock('fs')
const fs = require('fs')
const path = require('path')
const findStorage = require('browser/lib/findStorage')
jest.mock('unique-slug')
const uniqueSlug = require('unique-slug')
const mdurl = require('mdurl')
const fse = require('fs-extra')
const sander = require('sander')

const systemUnderTest = require('browser/main/lib/dataApi/attachmentManagement')

it('should test that copyAttachment should throw an error if sourcePath or storageKey or noteKey are undefined', function () {
  systemUnderTest.copyAttachment(undefined, 'storageKey').then(() => {}, error => {
    expect(error).toBe('sourceFilePath has to be given')
  })
  systemUnderTest.copyAttachment(null, 'storageKey', 'noteKey').then(() => {}, error => {
    expect(error).toBe('sourceFilePath has to be given')
  })
  systemUnderTest.copyAttachment('source', undefined, 'noteKey').then(() => {}, error => {
    expect(error).toBe('storageKey has to be given')
  })
  systemUnderTest.copyAttachment('source', null, 'noteKey').then(() => {}, error => {
    expect(error).toBe('storageKey has to be given')
  })
  systemUnderTest.copyAttachment('source', 'storageKey', null).then(() => {}, error => {
    expect(error).toBe('noteKey has to be given')
  })
  systemUnderTest.copyAttachment('source', 'storageKey', undefined).then(() => {}, error => {
    expect(error).toBe('noteKey has to be given')
  })
})

it('should test that copyAttachment should throw an error if sourcePath dosen\'t exists', function () {
  fs.existsSync = jest.fn()
  fs.existsSync.mockReturnValue(false)

  systemUnderTest.copyAttachment('path', 'storageKey', 'noteKey').then(() => {}, error => {
    expect(error).toBe('source file does not exist')
    expect(fs.existsSync).toHaveBeenCalledWith('path')
  })
})

it('should test that copyAttachment works correctly assuming correct working of fs', function () {
  const dummyExtension = '.ext'
  const sourcePath = 'path' + dummyExtension
  const storageKey = 'storageKey'
  const noteKey = 'noteKey'
  const dummyUniquePath = 'dummyPath'
  const dummyStorage = {path: 'dummyStoragePath'}

  fs.existsSync = jest.fn()
  fs.existsSync.mockReturnValue(true)
  fs.createReadStream = jest.fn()
  fs.createReadStream.mockReturnValue({pipe: jest.fn()})
  fs.createWriteStream = jest.fn()

  findStorage.findStorage = jest.fn()
  findStorage.findStorage.mockReturnValue(dummyStorage)
  uniqueSlug.mockReturnValue(dummyUniquePath)

  systemUnderTest.copyAttachment(sourcePath, storageKey, noteKey).then(
    function (newFileName) {
      expect(findStorage.findStorage).toHaveBeenCalledWith(storageKey)
      expect(fs.createReadStream).toHaveBeenCalledWith(sourcePath)
      expect(fs.existsSync).toHaveBeenCalledWith(sourcePath)
      expect(fs.createReadStream().pipe).toHaveBeenCalled()
      expect(fs.createWriteStream).toHaveBeenCalledWith(path.join(dummyStorage.path, systemUnderTest.DESTINATION_FOLDER, noteKey, dummyUniquePath + dummyExtension))
      expect(newFileName).toBe(dummyUniquePath + dummyExtension)
    })
})

it('should test that copyAttachment creates a new folder if the attachment folder doesn\'t exist', function () {
  const dummyStorage = {path: 'dummyStoragePath'}
  const noteKey = 'noteKey'
  const attachmentFolderPath = path.join(dummyStorage.path, systemUnderTest.DESTINATION_FOLDER)
  const attachmentFolderNoteKyPath = path.join(dummyStorage.path, systemUnderTest.DESTINATION_FOLDER, noteKey)

  fs.existsSync = jest.fn()
  fs.existsSync.mockReturnValueOnce(true)
  fs.existsSync.mockReturnValueOnce(false)
  fs.existsSync.mockReturnValueOnce(false)
  fs.mkdirSync = jest.fn()

  findStorage.findStorage = jest.fn()
  findStorage.findStorage.mockReturnValue(dummyStorage)
  uniqueSlug.mockReturnValue('dummyPath')

  systemUnderTest.copyAttachment('path', 'storageKey', 'noteKey').then(
    function () {
      expect(fs.existsSync).toHaveBeenCalledWith(attachmentFolderPath)
      expect(fs.mkdirSync).toHaveBeenCalledWith(attachmentFolderPath)
      expect(fs.existsSync).toHaveBeenLastCalledWith(attachmentFolderNoteKyPath)
      expect(fs.mkdirSync).toHaveBeenLastCalledWith(attachmentFolderNoteKyPath)
    })
})

it('should test that copyAttachment don\'t uses a random file name if not intended ', function () {
  const dummyStorage = {path: 'dummyStoragePath'}

  fs.existsSync = jest.fn()
  fs.existsSync.mockReturnValueOnce(true)
  fs.existsSync.mockReturnValueOnce(false)
  fs.mkdirSync = jest.fn()

  findStorage.findStorage = jest.fn()
  findStorage.findStorage.mockReturnValue(dummyStorage)
  uniqueSlug.mockReturnValue('dummyPath')

  systemUnderTest.copyAttachment('path', 'storageKey', 'noteKey', false).then(
    function (newFileName) {
      expect(newFileName).toBe('path')
    })
})

it('should replace the all ":storage" path with the actual storage path', function () {
  const storageFolder = systemUnderTest.DESTINATION_FOLDER
  const testInput =
    '<html>\n' +
    '    <head>\n' +
    '        //header\n' +
    '    </head>\n' +
    '    <body data-theme="default">\n' +
    '        <h2 data-line="0" id="Headline">Headline</h2>\n' +
    '        <p data-line="2">\n' +
    '            <img src=":storage' + mdurl.encode(path.sep) + '0.6r4zdgc22xp.png" alt="dummyImage.png" >\n' +
    '        </p>\n' +
    '        <p data-line="4">\n' +
    '            <a href=":storage' + mdurl.encode(path.sep) + '0.q2i4iw0fyx.pdf">dummyPDF.pdf</a>\n' +
    '        </p>\n' +
    '        <p data-line="6">\n' +
    '            <img src=":storage' + mdurl.encode(path.sep) + 'd6c5ee92.jpg" alt="dummyImage2.jpg">\n' +
    '        </p>\n' +
    '    </body>\n' +
    '</html>'
  const storagePath = '<<dummyStoragePath>>'
  const expectedOutput =
    '<html>\n' +
    '    <head>\n' +
    '        //header\n' +
    '    </head>\n' +
    '    <body data-theme="default">\n' +
    '        <h2 data-line="0" id="Headline">Headline</h2>\n' +
    '        <p data-line="2">\n' +
    '            <img src="file:///' + storagePath + path.sep + storageFolder + path.sep + '0.6r4zdgc22xp.png" alt="dummyImage.png" >\n' +
    '        </p>\n' +
    '        <p data-line="4">\n' +
    '            <a href="file:///' + storagePath + path.sep + storageFolder + path.sep + '0.q2i4iw0fyx.pdf">dummyPDF.pdf</a>\n' +
    '        </p>\n' +
    '        <p data-line="6">\n' +
    '            <img src="file:///' + storagePath + path.sep + storageFolder + path.sep + 'd6c5ee92.jpg" alt="dummyImage2.jpg">\n' +
    '        </p>\n' +
    '    </body>\n' +
    '</html>'
  const actual = systemUnderTest.fixLocalURLS(testInput, storagePath)
  expect(actual).toEqual(expectedOutput)
})

it('should test that generateAttachmentMarkdown works correct both with previews and without', function () {
  const fileName = 'fileName'
  const path = 'path'
  let expected = `![${fileName}](${path})`
  let actual = systemUnderTest.generateAttachmentMarkdown(fileName, path, true)
  expect(actual).toEqual(expected)
  expected = `[${fileName}](${path})`
  actual = systemUnderTest.generateAttachmentMarkdown(fileName, path, false)
  expect(actual).toEqual(expected)
})

it('should test that getAttachmentsInContent finds all attachments', function () {
  const testInput =
    '<html>\n' +
    '    <head>\n' +
    '        //header\n' +
    '    </head>\n' +
    '    <body data-theme="default">\n' +
    '        <h2 data-line="0" id="Headline">Headline</h2>\n' +
    '        <p data-line="2">\n' +
    '            <img src=":storage' + mdurl.encode(path.sep) + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + mdurl.encode(path.sep) + '0.6r4zdgc22xp.png" alt="dummyImage.png" >\n' +
    '        </p>\n' +
    '        <p data-line="4">\n' +
    '            <a href=":storage' + mdurl.encode(path.sep) + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + mdurl.encode(path.sep) + '0.q2i4iw0fyx.pdf">dummyPDF.pdf</a>\n' +
    '        </p>\n' +
    '        <p data-line="6">\n' +
    '            <img src=":storage' + mdurl.encode(path.sep) + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + mdurl.encode(path.sep) + 'd6c5ee92.jpg" alt="dummyImage2.jpg">\n' +
    '        </p>\n' +
    '    </body>\n' +
    '</html>'
  const actual = systemUnderTest.getAttachmentsInContent(testInput)
  const expected = [':storage' + path.sep + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + path.sep + '0.6r4zdgc22xp', ':storage' + path.sep + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + path.sep + '0.q2i4iw0fyx', ':storage' + path.sep + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + path.sep + 'd6c5ee92.jpg']
  expect(actual).toEqual(expect.arrayContaining(expected))
})

it('should test that getAbsolutePathsOfAttachmentsInContent returns all absolute paths', function () {
  const dummyStoragePath = 'dummyStoragePath'
  const testInput =
    '<html>\n' +
    '    <head>\n' +
    '        //header\n' +
    '    </head>\n' +
    '    <body data-theme="default">\n' +
    '        <h2 data-line="0" id="Headline">Headline</h2>\n' +
    '        <p data-line="2">\n' +
    '            <img src=":storage' + mdurl.encode(path.sep) + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + mdurl.encode(path.sep) + '0.6r4zdgc22xp.png" alt="dummyImage.png" >\n' +
    '        </p>\n' +
    '        <p data-line="4">\n' +
    '            <a href=":storage' + mdurl.encode(path.sep) + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + mdurl.encode(path.sep) + '0.q2i4iw0fyx.pdf">dummyPDF.pdf</a>\n' +
    '        </p>\n' +
    '        <p data-line="6">\n' +
    '            <img src=":storage' + mdurl.encode(path.sep) + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + mdurl.encode(path.sep) + 'd6c5ee92.jpg" alt="dummyImage2.jpg">\n' +
    '        </p>\n' +
    '    </body>\n' +
    '</html>'
  const actual = systemUnderTest.getAbsolutePathsOfAttachmentsInContent(testInput, dummyStoragePath)
  const expected = [dummyStoragePath + path.sep + systemUnderTest.DESTINATION_FOLDER + path.sep + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + path.sep + '0.6r4zdgc22xp',
    dummyStoragePath + path.sep + systemUnderTest.DESTINATION_FOLDER + path.sep + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + path.sep + '0.q2i4iw0fyx',
    dummyStoragePath + path.sep + systemUnderTest.DESTINATION_FOLDER + path.sep + '9c9c4ba3-bc1e-441f-9866-c1e9a806e31c' + path.sep + 'd6c5ee92.jpg']
  expect(actual).toEqual(expect.arrayContaining(expected))
})

it('should remove the all ":storage" and noteKey references', function () {
  const storageFolder = systemUnderTest.DESTINATION_FOLDER
  const noteKey = 'noteKey'
  const testInput =
    '<html>\n' +
    '    <head>\n' +
    '        //header\n' +
    '    </head>\n' +
    '    <body data-theme="default">\n' +
    '        <h2 data-line="0" id="Headline">Headline</h2>\n' +
    '        <p data-line="2">\n' +
    '            <img src=":storage' + mdurl.encode(path.sep) + noteKey + mdurl.encode(path.sep) + '0.6r4zdgc22xp.png" alt="dummyImage.png" >\n' +
    '        </p>\n' +
    '        <p data-line="4">\n' +
    '            <a href=":storage' + mdurl.encode(path.sep) + noteKey + mdurl.encode(path.sep) + '0.q2i4iw0fyx.pdf">dummyPDF.pdf</a>\n' +
    '        </p>\n' +
    '        <p data-line="6">\n' +
    '            <img src=":storage' + mdurl.encode(path.sep) + noteKey + mdurl.encode(path.sep) + 'd6c5ee92.jpg" alt="dummyImage2.jpg">\n' +
    '        </p>\n' +
    '    </body>\n' +
    '</html>'
  const expectedOutput =
    '<html>\n' +
    '    <head>\n' +
    '        //header\n' +
    '    </head>\n' +
    '    <body data-theme="default">\n' +
    '        <h2 data-line="0" id="Headline">Headline</h2>\n' +
    '        <p data-line="2">\n' +
    '            <img src="' + storageFolder + path.sep + '0.6r4zdgc22xp.png" alt="dummyImage.png" >\n' +
    '        </p>\n' +
    '        <p data-line="4">\n' +
    '            <a href="' + storageFolder + path.sep + '0.q2i4iw0fyx.pdf">dummyPDF.pdf</a>\n' +
    '        </p>\n' +
    '        <p data-line="6">\n' +
    '            <img src="' + storageFolder + path.sep + 'd6c5ee92.jpg" alt="dummyImage2.jpg">\n' +
    '        </p>\n' +
    '    </body>\n' +
    '</html>'
  const actual = systemUnderTest.removeStorageAndNoteReferences(testInput, noteKey)
  expect(actual).toEqual(expectedOutput)
})

it('should delete the correct attachment folder if a note is deleted', function () {
  const dummyStorage = {path: 'dummyStoragePath'}
  const storageKey = 'storageKey'
  const noteKey = 'noteKey'
  findStorage.findStorage = jest.fn(() => dummyStorage)
  sander.rimrafSync = jest.fn()

  const expectedPathToBeDeleted = path.join(dummyStorage.path, systemUnderTest.DESTINATION_FOLDER, noteKey)
  systemUnderTest.deleteAttachmentFolder(storageKey, noteKey)
  expect(findStorage.findStorage).toHaveBeenCalledWith(storageKey)
  expect(sander.rimrafSync).toHaveBeenCalledWith(expectedPathToBeDeleted)
})

it('should test that deleteAttachmentsNotPresentInNote deletes all unreferenced attachments ', function () {
  const dummyStorage = {path: 'dummyStoragePath'}
  const noteKey = 'noteKey'
  const storageKey = 'storageKey'
  const markdownContent = ''
  const dummyFilesInFolder = ['file1.txt', 'file2.pdf', 'file3.jpg']
  const attachmentFolderPath = path.join(dummyStorage.path, systemUnderTest.DESTINATION_FOLDER, noteKey)

  findStorage.findStorage = jest.fn(() => dummyStorage)
  fs.existsSync = jest.fn(() => true)
  fs.readdir = jest.fn((paht, callback) => callback(undefined, dummyFilesInFolder))
  fs.unlink = jest.fn()

  systemUnderTest.deleteAttachmentsNotPresentInNote(markdownContent, storageKey, noteKey)
  expect(fs.existsSync).toHaveBeenLastCalledWith(attachmentFolderPath)
  expect(fs.readdir).toHaveBeenCalledTimes(1)
  expect(fs.readdir.mock.calls[0][0]).toBe(attachmentFolderPath)

  expect(fs.unlink).toHaveBeenCalledTimes(dummyFilesInFolder.length)
  const fsUnlinkCallArguments = []
  for (let i = 0; i < dummyFilesInFolder.length; i++) {
    fsUnlinkCallArguments.push(fs.unlink.mock.calls[i][0])
  }

  dummyFilesInFolder.forEach(function (file) {
    expect(fsUnlinkCallArguments.includes(path.join(attachmentFolderPath, file))).toBe(true)
  })
})

it('should test that deleteAttachmentsNotPresentInNote does not delete referenced attachments', function () {
  const dummyStorage = {path: 'dummyStoragePath'}
  const noteKey = 'noteKey'
  const storageKey = 'storageKey'
  const dummyFilesInFolder = ['file1.txt', 'file2.pdf', 'file3.jpg']
  const markdownContent = systemUnderTest.generateAttachmentMarkdown('fileLabel', path.join(systemUnderTest.STORAGE_FOLDER_PLACEHOLDER, noteKey, dummyFilesInFolder[0]), false)
  const attachmentFolderPath = path.join(dummyStorage.path, systemUnderTest.DESTINATION_FOLDER, noteKey)

  findStorage.findStorage = jest.fn(() => dummyStorage)
  fs.existsSync = jest.fn(() => true)
  fs.readdir = jest.fn((paht, callback) => callback(undefined, dummyFilesInFolder))
  fs.unlink = jest.fn()

  systemUnderTest.deleteAttachmentsNotPresentInNote(markdownContent, storageKey, noteKey)

  expect(fs.unlink).toHaveBeenCalledTimes(dummyFilesInFolder.length - 1)
  const fsUnlinkCallArguments = []
  for (let i = 0; i < dummyFilesInFolder.length - 1; i++) {
    fsUnlinkCallArguments.push(fs.unlink.mock.calls[i][0])
  }
  expect(fsUnlinkCallArguments.includes(path.join(attachmentFolderPath, dummyFilesInFolder[0]))).toBe(false)
})

it('should test that moveAttachments moves attachments only if the source folder existed', function () {
  fse.existsSync = jest.fn(() => false)
  fse.moveSync = jest.fn()

  const oldPath = 'oldPath'
  const newPath = 'newPath'
  const oldNoteKey = 'oldNoteKey'
  const newNoteKey = 'newNoteKey'
  const content = ''

  const expectedSource = path.join(oldPath, systemUnderTest.DESTINATION_FOLDER, oldNoteKey)

  systemUnderTest.moveAttachments(oldPath, newPath, oldNoteKey, newNoteKey, content)
  expect(fse.existsSync).toHaveBeenCalledWith(expectedSource)
  expect(fse.moveSync).not.toHaveBeenCalled()
})

it('should test that moveAttachments moves attachments to the right destination', function () {
  fse.existsSync = jest.fn(() => true)
  fse.moveSync = jest.fn()

  const oldPath = 'oldPath'
  const newPath = 'newPath'
  const oldNoteKey = 'oldNoteKey'
  const newNoteKey = 'newNoteKey'
  const content = ''

  const expectedSource = path.join(oldPath, systemUnderTest.DESTINATION_FOLDER, oldNoteKey)
  const expectedDestination = path.join(newPath, systemUnderTest.DESTINATION_FOLDER, newNoteKey)

  systemUnderTest.moveAttachments(oldPath, newPath, oldNoteKey, newNoteKey, content)
  expect(fse.existsSync).toHaveBeenCalledWith(expectedSource)
  expect(fse.moveSync).toHaveBeenCalledWith(expectedSource, expectedDestination)
})

it('should test that moveAttachments returns a correct modified content version', function () {
  fse.existsSync = jest.fn()
  fse.moveSync = jest.fn()

  const oldPath = 'oldPath'
  const newPath = 'newPath'
  const oldNoteKey = 'oldNoteKey'
  const newNoteKey = 'newNoteKey'
  const testInput =
    'Test input' +
    '![' + systemUnderTest.STORAGE_FOLDER_PLACEHOLDER + path.sep + oldNoteKey + path.sep + 'image.jpg](imageName}) \n' +
    '[' + systemUnderTest.STORAGE_FOLDER_PLACEHOLDER + path.sep + oldNoteKey + path.sep + 'pdf.pdf](pdf})'
  const expectedOutput =
    'Test input' +
    '![' + systemUnderTest.STORAGE_FOLDER_PLACEHOLDER + path.sep + newNoteKey + path.sep + 'image.jpg](imageName}) \n' +
    '[' + systemUnderTest.STORAGE_FOLDER_PLACEHOLDER + path.sep + newNoteKey + path.sep + 'pdf.pdf](pdf})'

  const actualContent = systemUnderTest.moveAttachments(oldPath, newPath, oldNoteKey, newNoteKey, testInput)
  expect(actualContent).toBe(expectedOutput)
})
