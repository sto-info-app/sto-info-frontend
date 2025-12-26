import { Component } from '@angular/core';
import { UnknownServiceInterruptionComponent } from 'src/app/core/health/unknown-service-interruption/unknown-service-interruption.component';

@Component({
  selector: 'app-service-interruption',
  templateUrl: './service-interruption.component.html',
  standalone: true,
  imports: [UnknownServiceInterruptionComponent],
})
export class ServiceInterruptionComponent {}
