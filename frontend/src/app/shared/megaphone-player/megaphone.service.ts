import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MegaphonePlayerService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  private urlSubject = new BehaviorSubject<string | null>(null);

  isOpen$ = this.isOpenSubject.asObservable();
  url$ = this.urlSubject.asObservable();

  open(url: string) {
    this.urlSubject.next(url);
    this.isOpenSubject.next(true);
  }

  close() {
    this.isOpenSubject.next(false);
  }
}
