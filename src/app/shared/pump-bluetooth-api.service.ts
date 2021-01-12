import { ChangeDetectorRef, Injectable } from '@angular/core';
import { Peripheral } from 'nativescript-bluetooth';
import { Observable } from 'rxjs';
import { reduce } from 'rxjs/internal/operators/reduce';
import * as bluetooth from 'nativescript-bluetooth';
import * as appSettings from 'tns-core-modules/application-settings';
import { DataFacadeService } from '~/app/shared/data-facade.service';
import { DatabaseService } from '~/app/shared/database.service';
import { ForegroundFacadeService } from '~/app/shared/foreground-facade.service';
import { RawDataService } from '~/app/shared/raw-data-parse.service';
import * as traceModule from "tns-core-modules/trace"
import Thread = java.lang.Thread;

@Injectable({
  providedIn: 'root'
})
export class PumpBluetoothApiService {
  targetBluDeviceUUID: string;
  targetBluDeviceUUID2 = [];

  constructor(
    private databaseService: DatabaseService
  ) {
  }

  enable() {
    return new Promise((resolve, reject) => {
      const adapter = android.bluetooth.BluetoothAdapter;
      if (!adapter.getDefaultAdapter().isEnabled().valueOf()) {

        adapter.getDefaultAdapter().enable();
        resolve();
      }
      else {
        console.log('toottooto');
        resolve();
      }
    });
  }
  scanAndConnect2() {
    return new Observable<string>(observer => {
      this.targetBluDeviceUUID2 = [];
      this.enable().then(() => {
        const adapter2 = android.bluetooth.BluetoothAdapter;
        let step;
        for (step = 0 ; !(adapter2.getDefaultAdapter().isEnabled().valueOf() && step < 8); step++) {
          console.log("i jesze raz" + step + adapter2.getDefaultAdapter().isEnabled().valueOf());
          Thread.sleep(300);

        }

      //bluetooth.enable().then(() =>
      bluetooth
        .startScanning({
          onDiscovered: (peripheral: Peripheral) => {
            console.log(peripheral.name + peripheral.UUID + "C");
            observer.next(peripheral.name + peripheral.UUID);
            if (peripheral.name === 'MED-LINK' || peripheral.name === 'MED-LINK-2' || peripheral.name === 'MED-LINK-3' || peripheral.name === 'HMSoft') {
              this.targetBluDeviceUUID2.push(peripheral.name + ' ,' + peripheral.UUID);
              this.targetBluDeviceUUID = peripheral.UUID.toString();
              console.log("UIID: " + this.targetBluDeviceUUID);
            }
          }
          ,
          skipPermissionCheck: true,
          seconds: 2
        }).then(() => observer.complete()), () => this.enable()});
    }).pipe(reduce((acc, val) => acc + val));
  }
  private unsubscribeAll(): void {
    console.log("unsubscribeAll launchListenerCB:");
  }

  scanAndConnect() {
    return new Promise((resolve, reject) => {
      this.enable().then(() => {
        const adapter2 = android.bluetooth.BluetoothAdapter;
        let step;
        for (step = 0 ; !(adapter2.getDefaultAdapter().isEnabled().valueOf() && step < 8); step++) {
          Thread.sleep(300);
        }
      this.databaseService.getMAC().then(a =>
      {
        this.targetBluDeviceUUID = a.toString();

      bluetooth.connect({
        UUID: this.targetBluDeviceUUID,
        onConnected: (peripheral: Peripheral) => {
          console.log('Połączono' + peripheral.UUID + ' ' + peripheral.name);
          resolve(peripheral.name);
          appSettings.setBoolean("btBoolean", true);
        },
        onDisconnected: (peripheral: Peripheral) => {
          //peripheral.name = 'ZONK';
          console.log('Rozłączono' + peripheral.name + peripheral.UUID);
          reject(peripheral.name);
          appSettings.setBoolean("btBoolean", false);

          this.unsubscribeAll();
        }
      });
    })});
    });
    }
  sendCommand(command) {
    const buffer = [];
    console.log('bede wysylal komunikat');
    //traceModule.write( "AAAAAAAAAAAAAAa  YYYYYunhandled-error", traceModule.categories.Debug, 2);
    for (const char of command) {
      const charCode = char.charCodeAt(0);
      buffer.push(charCode);
    }
    if (buffer.length) {
      this.recursiveWrite(buffer);
      console.log('udalo sie chyba to wsykacccc komunikat');
    }
  }
  sendCommand4(command) {
    return new Promise((resolve, reject) => {
      const buffer = [];
      console.log('bede wysylal komunikat');
      //traceModule.write( "AAAAAAAAAAAAAAa  YYYYYunhandled-error", traceModule.categories.Debug, 2);
      for (const char of command) {
        const charCode = char.charCodeAt(0);
        buffer.push(charCode);
      }
      if (buffer.length) {
        this.recursiveWrite(buffer);
        console.log('udalo sie chyba to wsykacccc komunikat');
        resolve();
      }
    })
  }
  sendCommand2(command) {
    const buffer = [];
    console.log('prawdziwe ssss');
    for (const char of command) {
      const charCode = char.charCodeAt(0);
      buffer.push(charCode);
      if (charCode === 0x0a /*LF*/) {
        buffer.push(0x0d /*CR*/);
      }
    }
    if (buffer.length) {
      this.recursiveWrite(buffer);
    }
  }
  sendCommand3(command) {
    const buffer = [];
    console.log('prawdziwe ssss');
    for (const char of command) {
      const charCode = char.charCodeAt(0);
      buffer.push(charCode);


      console.log("aaatotootototo:"  + buffer );
    }
    if (buffer.length) {
      buffer.push(0x0d /*CR*/);
      buffer.push(0x0a /*LF*/);
      this.recursiveWrite(buffer);
    }
  }


  private recursiveWrite(
    array: Array<number>,
    startByte = 0,
    chunkLength = 20
  ) {
    const nextByte = startByte + chunkLength;
    bluetooth
      .writeWithoutResponse({
        peripheralUUID: this.targetBluDeviceUUID,
        characteristicUUID: 'ffe1',
        serviceUUID: 'ffe0',
        value: new Uint8Array(array.slice(startByte, nextByte))
      })
      .then(() => {
        if (nextByte < array.length) {
          this.recursiveWrite(array, nextByte);
        }
      });
  }

  disconnect() {
    bluetooth.disconnect({UUID: this.targetBluDeviceUUID});
  }

  read() {
    return new Observable<string>(observer => {
      bluetooth.startNotifying({
        onNotify: ({ value }) => {
          const result = new Uint8Array(value).reduce(
            (o, byte) => (o += String.fromCharCode(byte)),
            ''
          );

          observer.next(result);
          console.log(result);
          if (result.includes('rea') || result.includes('komunikacji')) {
            observer.complete();

          }
        },
        peripheralUUID: this.targetBluDeviceUUID,
        characteristicUUID: 'ffe1',
        serviceUUID: 'ffe0'
      });
    }).pipe(reduce((acc, val) => acc + val));
  }
  read2() {
    return new Observable<string>(observer => {
      bluetooth.startNotifying({
        onNotify: ({ value }) => {
          const result = new Uint8Array(value).reduce(
              (o, byte) => (o += String.fromCharCode(byte)),
              ''
          );

          observer.next(result);
          console.log(result);
          if (result.includes('EomEomEo') || result.includes('Podaj numer') ||  result.includes('Test O') ||  result.includes('Podaj imie') || result.includes('KASUJ')) {
            observer.complete();
          }
        },
        peripheralUUID: this.targetBluDeviceUUID,
        characteristicUUID: 'ffe1',
        serviceUUID: 'ffe0',
      });
    }).pipe(reduce((acc, val) => acc + val));
  }
  read3() {
    return new Observable<string>(observer => {
      bluetooth.startNotifying({
        onNotify: ({ value }) => {
          const result = new Uint8Array(value).reduce(
            (o, byte) => (o += String.fromCharCode(byte)),
            ''
          );

          observer.next(result);
          console.log(result);
          if (result.includes('zatrzyman') || result.includes('uruchomion') || result.includes('ustaw')) {
            observer.complete();
          }
        },
        peripheralUUID: this.targetBluDeviceUUID,
        characteristicUUID: 'ffe1',
        serviceUUID: 'ffe0'
      });
    }).pipe(reduce((acc, val) => acc + val));
  }
  read4() {
    return new Observable<string>(observer => {
      bluetooth.startNotifying({
        onNotify: ({ value }) => {
          const result = new Uint8Array(value).reduce(
            (o, byte) => (o += String.fromCharCode(byte)),
            ''
          );

          observer.next(result);
          console.log(result);
          if (result.includes('uruchomion')) {
            observer.complete();
          }
        },
        peripheralUUID: this.targetBluDeviceUUID,
        characteristicUUID: 'ffe1',
        serviceUUID: 'ffe0'
      });
    }).pipe(reduce((acc, val) => acc + val));
  }
   read7() {
    return new Observable<string>(observer => {
      bluetooth.startNotifying({
        onNotify: ({ value }) => {
          const result = new Uint8Array(value).reduce(
            (o, byte) => (o += String.fromCharCode(byte)),
            ''
          );
          console.log(result);
          if (result.includes('CONN')) {
            observer.next(result);
          }
          if (result.includes('rea')) {
            console.log('HAHAHAHH MAMY TOOOO');
            observer.complete();
          }
        },
        peripheralUUID: this.targetBluDeviceUUID,
        characteristicUUID: 'ffe1',
        serviceUUID: 'ffe0'
      }).then(() => console.log('Przyszło OK'), () => console.log('Error OBSLUGA!!!'));

    })
  }
  stopNotify() {

    console.log('bede wywalal NOTUIFUYYYYYYY');
    Thread.sleep(7500)
    bluetooth.stopNotifying({
        peripheralUUID: this.targetBluDeviceUUID,
        characteristicUUID: 'ffe1',
        serviceUUID: 'ffe0'
    }).then(function() {
      console.log("unsubscribed for notifications");
    }, function (err) {
      console.log("unsubscribe error: " + err);
    });
  }
  read5() {
    return new Observable<string>(observer => {
      bluetooth.startNotifying({
        onNotify: ({ value }) => {
          const result = new Uint8Array(value).reduce(
            (o, byte) => (o += String.fromCharCode(byte)),
            ''
          );

          observer.next(result);
          console.log(result);
          if (result.includes('zatrzyman') || result.includes('ready')) {
            observer.complete();
          }
        },
        peripheralUUID: this.targetBluDeviceUUID,
        characteristicUUID: 'ffe1',
        serviceUUID: 'ffe0'
      });
    }).pipe(reduce((acc, val) => acc + val));
  }
  read6() {
    return new Observable<string>(observer => {
      bluetooth.startNotifying({
        onNotify: ({ value }) => {
          const result = new Uint8Array(value).reduce(
            (o, byte) => (o += String.fromCharCode(byte)),
            ''
          );

          observer.next(result);
          console.log(result);
          if (result.includes('rea')) {
            observer.complete();
          }
        },
        peripheralUUID: this.targetBluDeviceUUID,
        characteristicUUID: 'ffe1',
        serviceUUID: 'ffe0'
      });
    }).pipe(reduce((acc, val) => acc + val));
  }
}
