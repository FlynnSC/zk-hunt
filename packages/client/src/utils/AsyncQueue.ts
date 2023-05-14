import {Subject} from 'rxjs';

// A queue which can process a number of concurrent async tasks, up to a maximum amount, and will
// only begin processing a new task once capacity is available.
export class AsyncQueue {
  private maxActiveTaskCount: number;
  private idQueue = [] as symbol[];
  private signalSubject = new Subject<boolean>();
  private activeTaskCount = 0;

  constructor(maxConcurrentTasks: number) {
    this.maxActiveTaskCount = maxConcurrentTasks;
  }

  push<T>(callback: () => Promise<T>): Promise<T> {
    const id = Symbol();
    this.idQueue.push(id);

    return new Promise<T>(resolve => {
      const subscription = this.signalSubject.subscribe(() => {
        if (this.idQueue[0] === id && this.activeTaskCount < this.maxActiveTaskCount) {
          this.idQueue = this.idQueue.slice(1);
          ++this.activeTaskCount;
          subscription.unsubscribe();
          callback().then(resolve).finally(() => {
            --this.activeTaskCount;
            this.signalSubject.next(true);
          });
        }
      });
      if (this.activeTaskCount < this.maxActiveTaskCount) {
        this.signalSubject.next(true);
      }
    });
  }
}
