import { Directive, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Roles } from '../servicios/roles';

@Directive({
  selector: '[appRolAdmin]',
  standalone: true
})
export class RolAdmin {

  rolesService = inject(Roles)

  constructor(private template: TemplateRef<any>, private viewContainer: ViewContainerRef) {}
  
  @Input() appRolAdmin!: string;

  async ngOnInit() {
    const rol = await this.rolesService.getRol();

    if (rol === this.appRolAdmin) {
      this.viewContainer.createEmbeddedView(this.template);
    } else {
      this.viewContainer.clear();
    }
  }


}
