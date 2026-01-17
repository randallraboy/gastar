import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import {
  faEdit,
  faBookOpen,
  faCalendar,
  faTrash,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { NavComponent } from './components/nav/nav.component';
import { HomeComponent } from './components/home/home.component';
import { AccountComponent } from './components/account/account.component';
import { CategoryComponent } from './components/category/category.component';
import { ReportComponent } from './components/report/report.component';

@NgModule({ declarations: [
        AppComponent,
        NavComponent,
        HomeComponent,
        AccountComponent,
        CategoryComponent,
        ReportComponent,
    ],
    bootstrap: [AppComponent], imports: [AppRoutingModule,
        BrowserModule,
        FontAwesomeModule,
        FormsModule], providers: [
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule {
  constructor(library: FaIconLibrary) {
    library.addIcons(
      faEdit,
      faBookOpen,
      faCalendar,
      faTrash,
      faPlus,
    );
  }
}