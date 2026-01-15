# Memory Leak Prevention - Quick Reference Guide

## 🎯 Quick Start

When creating or modifying Angular components, follow these patterns to prevent memory leaks.

---

## ✅ Pattern 1: Component with Subscriptions

```typescript
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

export class MyComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly myService = inject(MyService);

  ngOnInit(): void {
    this.myService
      .getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // Handle data
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## ✅ Pattern 2: Component with Form Value Changes

```typescript
export class MyFormComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  form: FormGroup;

  ngOnInit(): void {
    this.form
      .get('myField')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        // Handle value change
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## ✅ Pattern 3: Component with Dialogs

```typescript
export class MyComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly dialog = inject(MatDialog);
  private dialogRef: MatDialogRef<any> | null = null;

  openDialog(): void {
    this.dialogRef = this.dialog.open(MyDialogComponent);

    this.dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        // Handle result
        this.dialogRef = null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Close any open dialogs
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}
```

---

## ✅ Pattern 4: Component with Route Params

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      // Handle params
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## ✅ Pattern 5: Component with DOM Event Listeners

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private eventHandler?: (event: Event) => void;

  ngOnInit(): void {
    this.eventHandler = (event: Event) => {
      // Handle event
    };

    document.addEventListener('my-event', this.eventHandler);
  }

  ngOnDestroy(): void {
    if (this.eventHandler) {
      document.removeEventListener('my-event', this.eventHandler);
    }
  }
}
```

---

## ✅ Pattern 6: Component with Timers

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      // Do something periodically
    }, 1000);

    this.timeoutId = setTimeout(() => {
      // Do something once
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
```

---

## ✅ Pattern 7: Component with Nested Subscriptions

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.service1
      .getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // Nested subscription also needs takeUntil
        this.service2
          .getDetails(data.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe(details => {
            // Handle details
          });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## ✅ Pattern 8: Component with forkJoin

```typescript
export class MyComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    forkJoin({
      users: this.userService.getUsers(),
      posts: this.postService.getPosts(),
      comments: this.commentService.getComments(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ users, posts, comments }) => {
        // Handle all data
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## ❌ Common Mistakes to Avoid

### ❌ Forgetting takeUntil

```typescript
// BAD - Memory leak!
ngOnInit(): void {
  this.service.getData().subscribe(data => {
    // This subscription never ends!
  });
}
```

```typescript
// GOOD
ngOnInit(): void {
  this.service.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      // Subscription ends when component destroyed
    });
}
```

### ❌ Not calling complete()

```typescript
// BAD - Subject not fully cleaned up
ngOnDestroy(): void {
  this.destroy$.next();
  // Missing .complete()!
}
```

```typescript
// GOOD
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### ❌ Missing OnDestroy implementation

```typescript
// BAD - No cleanup!
export class MyComponent implements OnInit {
  private readonly destroy$ = new Subject<void>();
  // No ngOnDestroy - destroy$ never triggered!
}
```

```typescript
// GOOD
export class MyComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### ❌ Forgetting nested subscriptions

```typescript
// BAD - Inner subscription leaks!
this.service1
  .getData()
  .pipe(takeUntil(this.destroy$))
  .subscribe(data => {
    this.service2.getMore(data.id).subscribe(more => {
      // This subscription never ends!
    });
  });
```

```typescript
// GOOD
this.service1
  .getData()
  .pipe(takeUntil(this.destroy$))
  .subscribe(data => {
    this.service2
      .getMore(data.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(more => {
        // Both subscriptions end properly
      });
  });
```

---

## 🎓 When You DON'T Need takeUntil

### ✅ HTTP Requests (But Still Recommended)

```typescript
// HTTP requests complete automatically, but takeUntil helps cancel in-flight requests
this.http
  .get('/api/data')
  .pipe(takeUntil(this.destroy$)) // Optional but recommended
  .subscribe(data => {});
```

### ✅ Async Pipe in Templates

```typescript
// Template automatically unsubscribes
data$ = this.service.getData();
```

```html
<div *ngIf="data$ | async as data">{{ data }}</div>
```

### ✅ take(1) Operator

```typescript
// Automatically completes after 1 emission
this.service
  .getData()
  .pipe(take(1))
  .subscribe(data => {});
```

---

## 📋 Checklist for Code Review

- [ ] Component implements `OnDestroy` if it has subscriptions
- [ ] `destroy$` Subject is created and used
- [ ] All subscriptions use `takeUntil(this.destroy$)`
- [ ] `ngOnDestroy()` calls both `.next()` and `.complete()`
- [ ] Nested subscriptions also use `takeUntil`
- [ ] Event listeners are removed in `ngOnDestroy`
- [ ] Timers are cleared in `ngOnDestroy`
- [ ] Dialog references are cleaned up
- [ ] Form subscriptions are managed

---

## 🚀 Quick Commands

```bash
# Check for potential memory leaks
npm run lint

# Run tests
npm run test

# Test coverage
npm run test:cov
```

---

## 📚 Resources

### Angular Documentation

- [Managing Subscriptions](https://angular.io/guide/observables-in-angular)
- [Lifecycle Hooks](https://angular.io/guide/lifecycle-hooks)
- [RxJS Operators](https://rxjs.dev/api)

---

## 💡 Pro Tips

1. **Create destroy$ as private readonly**: Prevents accidental misuse
2. **Use consistent naming**: Always use `destroy$` for clarity
3. **Add TODO comments**: Mark areas that need review
4. **Test thoroughly**: Navigate back and forth between pages
5. **Monitor memory**: Use Chrome DevTools Performance tab

---

**Remember:** _Prevention is better than cure. Always implement proper cleanup from the start!_
