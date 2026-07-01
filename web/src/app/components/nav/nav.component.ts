import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-nav',
    templateUrl: './nav.component.html',
    styleUrl: './nav.component.scss',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
})
export class NavComponent {

}
