import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-character-progress-filters',
  templateUrl: './character-progress-filters.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  styles: [
    `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
    `,
  ],
})
export class CharacterProgressFiltersComponent {
  @Input({ required: true }) searchId!: string;
  @Input({ required: true }) searchLabel!: string;
  @Input() filtersCollapsed = false;
  @Input() searchText = '';
  @Input() hideComplete = false;
  @Input() completeCount = 0;
  @Input() activeFilterCount = 0;
  @Input() hideCompleteLabel = 'Hide Completed';
  @Input() showCompleteLabel = 'Show Completed';

  @Output() readonly filtersCollapsedChange = new EventEmitter<boolean>();
  @Output() readonly searchTextChange = new EventEmitter<string>();
  @Output() readonly hideCompleteChange = new EventEmitter<boolean>();
  @Output() readonly clearFilters = new EventEmitter<void>();
  @Output() readonly refresh = new EventEmitter<void>();
}
