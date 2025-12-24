import * as flydrive from 'flydrive';
console.log('Keys:', Object.keys(flydrive));
try {
  const { DriveManager } = flydrive;
  console.log('DriveManager:', DriveManager);
} catch (e) {
  console.log('Error importing DriveManager');
}
