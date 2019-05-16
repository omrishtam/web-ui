import { Component, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { UploadService } from '../../../service/upload.service';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-upload-dialog',
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.scss']
})
export class UploadDialogComponent {
  upload: { [key: string]: { progress: Observable<number>, response: Observable<HttpResponse<{}>> } };
  uploadsDone: { [key: string]: boolean } = {};
  uploadsError: { [key: string]: any } = {};
  canBeClosed = true;
  primaryButtonText = 'Upload';
  showCancelButton = true;
  uploading = false;
  uploadSuccessful = false;
  @ViewChild('file') file: ElementRef<HTMLInputElement>;
  public files: Set<File> = new Set();
  constructor(public dialogRef: MatDialogRef<UploadDialogComponent>, public uploadService: UploadService) {}
  public addFiles() {
    this.file.nativeElement.click();
  }

  public onFilesAdded() {
    const files: { [key: number]: File } = this.file.nativeElement.files;
    for (let key in files) {
      if (!isNaN(parseInt(key))) {
        this.files.add(files[key]);
      }
    }
  }

  closeDialog() {
    // if everything was uploaded already, just close the dialog
    if (this.uploadSuccessful) {
      return this.dialogRef.close(true);
    }
  
    // set the component state to "uploading"
    this.uploading = true;
  
    // start the upload and save the progress map
    this.upload = this.uploadService.upload(this.files);
  
    // convert the progress map into an array
    let allProgressObservables = [];
    for (let key in this.upload) {
      allProgressObservables.push(this.upload[key].progress);
      this.upload[key].response.subscribe(event => {
        if (event.ok) {
          this.uploadsDone[key] = true;
        }
      }, err => {
        this.uploadsError[key] = err;
        this.uploadsDone[key] = false;
      });
    }
  
    // Adjust the state variables
  
    // The OK-button should have the text "Finish" now
    this.primaryButtonText = 'Finish';
  
    // The dialog should not be closed while uploading
    this.canBeClosed = false;
    this.dialogRef.disableClose = true;
  
    // Hide the cancel-button
    this.showCancelButton = false;
  
    // When all progress-observables are completed...
    forkJoin(allProgressObservables).subscribe(end => {
      // ... the dialog can be closed again...
      this.canBeClosed = true;
      this.dialogRef.disableClose = false;
  
      // ... the upload was successful...
      this.uploadSuccessful = true;
  
      // ... and the component is no longer uploading
      this.uploading = false;
    });
  }

  public getUploadsDoneCount() {
    let doneCount = 0;
    for (let key in this.uploadsDone) {
      if (!this.uploadsError[key] && this.uploadsDone[key]) {
        doneCount++;
      }
    }

    return doneCount;
  }
}
