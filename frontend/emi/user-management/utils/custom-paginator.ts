import {TranslateService} from '@ngx-translate/core';
import {MatPaginatorIntl} from '@angular/material';
import {Injectable} from '@angular/core';

@Injectable()
export class CustomPaginator extends MatPaginatorIntl {
  ofLabel: String;
  constructor(private translate: TranslateService) {
    super();
    this.translate.onLangChange.subscribe((e: Event) => {
      this.getAndInitTranslations();
    });

    this.getAndInitTranslations();
  }

  getAndInitTranslations() {
    this.translate.get(['ITEMS_PER_PAGE', 'NEXT_PAGE', 'PREVIOUS_PAGE', 'OF_LABEL']).subscribe(translation => {
      this.itemsPerPageLabel = translation['ITEMS_PER_PAGE'];
      this.nextPageLabel = translation['NEXT_PAGE'];
      this.previousPageLabel = translation['PREVIOUS_PAGE'];
      this.ofLabel = translation['OF_LABEL'];
      this.changes.next();
    });
  }

  getRangeLabel = (page: number, pageSize: number, totalResults: number) => {
    return '';
  }
}