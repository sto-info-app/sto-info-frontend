import {
  DestroyRef,
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Permission } from 'src/app/models/access-control.models';
import { AccessControlService } from 'src/app/shared/services/access-control.service';

/**
 * Renders its content only when the signed-in user holds a permission.
 *
 * ```html
 * <button *appHasPermission="PERMISSIONS.STORYTIME_STORY_CREATE">
 *   Create Story
 * </button>
 * ```
 *
 * This is presentation only. Hiding a control spares the user a request that
 * would be refused; it is not what stops the action, because the server
 * independently refuses anything the caller is not entitled to.
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly _templateRef = inject<TemplateRef<unknown>>(
    TemplateRef<unknown>,
  );
  private readonly _viewContainer = inject(ViewContainerRef);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _destroyRef = inject(DestroyRef);

  /** Whether the view is currently rendered, so it is not created twice. */
  private _isRendered = false;

  /**
   * The permission the viewer must hold for the content to render.
   *
   * @param permission - The required permission code.
   */
  @Input({ required: true })
  set appHasPermission(permission: Permission) {
    this._accessControlService
      .hasPermission(permission)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(isPermitted => this.render(isPermitted));
  }

  /**
   * Creates or clears the embedded view.
   *
   * @param isPermitted - Whether the viewer holds the permission.
   */
  private render(isPermitted: boolean): void {
    if (isPermitted && !this._isRendered) {
      this._viewContainer.createEmbeddedView(this._templateRef);
      this._isRendered = true;
      return;
    }

    if (!isPermitted && this._isRendered) {
      this._viewContainer.clear();
      this._isRendered = false;
    }
  }
}
