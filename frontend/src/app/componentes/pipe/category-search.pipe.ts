import { Pipe, PipeTransform } from '@angular/core';
import { CategoriaPayload } from './../../services/categorias-service';

@Pipe({ name: 'categorySearch', standalone: true })
export class CategorySearchPipe implements PipeTransform {
  transform(items: CategoriaPayload[] = [], q: string = ''): CategoriaPayload[] {
    const k = (q || '').trim().toLowerCase();
    if (!k) return items;
    return items.filter(i => (i.name || '').toLowerCase().includes(k));
  }
}
