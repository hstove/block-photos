import * as loadImage from 'blueimp-load-image';

import PhotosService from './PhotosService';
import PresentingService from './PresentingService';

export default class UploadService {

  root = document.getElementById('root');

  constructor(callback) {
    this.photosService = new PhotosService();
    this.present = new PresentingService();
    this.callback = callback;
    this.dropEventBinding = this.dropEvent.bind(this);
    this.handleFileSelectEventBinding = this.handleFileSelectEvent.bind(this);
  }

  addEventListeners(fileDialog) {
    this.root.addEventListener('dragover', this.dragoverEvent);
    this.root.addEventListener('drop', this.dropEventBinding);
    if (fileDialog && document.getElementById('file-upload')) {
      document.getElementById('file-upload').addEventListener('change', this.handleFileSelectEventBinding, false);
    }
  }

  removeEventListeners(fileDialog) {
    this.root.removeEventListener('dragover', this.dragoverEvent);
    this.root.removeEventListener('drop', this.dropEventBinding);
    if (fileDialog && document.getElementById('file-upload')) {
      document.getElementById('file-upload').removeEventListener('change', this.handleFileSelectEventBinding);
    }
  }

  dragoverEvent(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  dropEvent(event) {
    event.stopPropagation();
    event.preventDefault();

    if (event.dataTransfer.items) {
      const photosToUpload = [];
      for (var i = 0; i < event.dataTransfer.items.length; i++) {
        let item = {
          kind: event.dataTransfer.items[i].kind,
          file: event.dataTransfer.items[i].getAsFile()
        };
        photosToUpload.push(item);
      }
      this.processUpload(photosToUpload, 0);

      event.dataTransfer.items.clear();
    }
  }

  handleFileSelectEvent(event) {
    event.stopPropagation();
    event.preventDefault();

    const files = event.target.files;

    if (files) {
      const photosToUpload = [];
      for (var i = 0; i < files.length; i++) {
        let item = {
          kind: 'file',
          file: files[i]
        };
        photosToUpload.push(item);
      }
      this.processUpload(photosToUpload, 0);
    }
  }

  async processUpload(list, currentIndex) {
    if (currentIndex === 0) {
      await this.present.loading('Uploading photos...');
    }
    // If dropped items aren't files, reject them
    if (list[currentIndex]) {
      const file = list[currentIndex].file;
      if (list[currentIndex].kind === 'file') {
        if (file.type.indexOf('image') !== -1) {

          loadImage.parseMetaData(
            file,
            (data) => {
              const reader = new FileReader();

              let orientation = 1;
              if (data && data.exif) {
                orientation = data.exif.get('Orientation');
              }

              // Closure to capture the file information.
              reader.onload = ((loadedFile, loadedList, orientation) => {
                return async (event) => {
                  if (orientation) {
                    loadedFile.exifdata = { tags: { Orientation: orientation, OriginalOrientation: orientation } };
                  }
                  const metadata = {
                    "filename": loadedFile.name,
                    "stats": loadedFile
                  };
                  await this.uploadPhoto(metadata, event);
                  if (loadedList[currentIndex + 1]) {
                    this.processUpload(loadedList, currentIndex + 1);
                  } else {
                    this.uploadFilesDone();
                  }
                };
              })(file, list, orientation);
              // Read in the image file as a data URL.
              reader.readAsDataURL(file);
            },
            {
                maxMetaDataSize: 262144,
                disableImageHead: false
            }
          );
        } else {
          this.present.toast('The file "' + file.name + '" could not be uploaded, are you sure it\'s a photo?');
          if (list[currentIndex + 1]) {
            this.processUpload(list, currentIndex + 1);
          } else {
            this.uploadFilesDone();
          }
        }
      } else {
 
        if (file && file.name) {
          this.present.toast('The file "' + file.name + '" could not be uploaded, are you sure it\'s a photo?');
        } else {
          this.present.toast('One of the files could not be uploaded, are you sure it\'s a photo?');
        }
        if (list[currentIndex + 1]) {
          this.processUpload(list, currentIndex + 1);
        } else {
          this.uploadFilesDone();
        }
      }
    } else {
      this.present.toast('The file could not be uploaded, are you sure it\'s a photo?');
      if (list[currentIndex + 1]) {
        this.processUpload(list, currentIndex + 1);
      } else {
        this.uploadFilesDone();
      }
    }
  }

  async uploadPhoto(metadata, event) {
    if (metadata && event) {
      const response = await this.photosService.uploadPhoto(metadata, event);
      if (response.errorsList && response.errorsList.length > 0) {
        for (let error of response.errorsList) {
          if (error.errorCode === 'err_filesize') {
            this.present.toast('Failed to upload "' + error.id + '", photo exceeds file size limit of 5MB.');
          } else {
            this.present.toast('Failed to upload "' + error.id + '".');
          }
        }
      }
    } else {
      this.present.toast('Failed to upload "' + metadata.filename + '".');
    }
  }

  uploadFilesDone() {
    this.present.dismissLoading();
    if (this.callback && typeof (this.callback) === "function") {
      // execute the callback, passing parameters as necessary
      this.callback();
    }
  }
}
