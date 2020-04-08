import { Component } from '@angular/core';


import {  Platform, AlertController } from '@ionic/angular';

import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

declare let window: any; 
declare let cordova: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  constructor( private iba: InAppBrowser,private plt: Platform) {
   }
 
  openPage()
  {
    let inAppBrowserRef : any;
    this.plt.ready().then(() => {
    let option = "location=no,toolbar=no,clearcache=yes,clearsessioncache=yes,cleardata=yes";
    const browser = this.iba.create('/assets/Player/index.html','_self',option);
    const watch = browser.on('loaderror').subscribe(type => {
      console.log("loading",type);
    }  , err => {
      console.log("InAppBrowser loadstart Event Error: " + err);
  });
   });
  }
}




