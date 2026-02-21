import { TopicSubContent } from '../../shared/interfaces/topic-content';

function key(topicId: string, subId: string): string {
  return `${topicId}_${subId}`;
}

export const TOPIC_CONTENT_BY_KEY: Record<string, TopicSubContent> = {
  [key('javascript', 'types')]: {
    titleKey: 'NAV_SUB_javascript_types',
    descriptionKey: 'TOPIC_DESC_javascript_types',
    codeSnippets: [
      {
        language: 'javascript',
        code: `const count = 42;
let name = 'Alice';
const isActive = true;
const items = [1, 2, 3];
const user = { id: 1, role: 'admin' };`
      },
      {
        language: 'javascript',
        code: `// TypeScript: explicit types
let score: number = 100;
function greet(name: string): string {
  return \`Hello, \${name}\`;
}`
      }
    ]
  },
  [key('javascript', 'functions')]: {
    titleKey: 'NAV_SUB_javascript_functions',
    descriptionKey: 'TOPIC_DESC_javascript_functions',
    codeSnippets: [
      {
        language: 'javascript',
        code: `function add(a, b) {
  return a + b;
}
const multiply = (x, y) => x * y;
const double = (n) => n * 2;`
      },
      {
        language: 'javascript',
        code: `// Default parameters and rest
function log(message, prefix = 'INFO') {
  console.log(\`[\${prefix}] \${message}\`);
}
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}`
      }
    ]
  },
  [key('javascript', 'async')]: {
    titleKey: 'NAV_SUB_javascript_async',
    descriptionKey: 'TOPIC_DESC_javascript_async',
    codeSnippets: [
      {
        language: 'javascript',
        code: `// Promise
fetch('/api/users')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`
      },
      {
        language: 'javascript',
        code: `// async/await
async function loadUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  const user = await res.json();
  return user;
}`
      }
    ]
  },
  [key('angular', 'components')]: {
    titleKey: 'NAV_SUB_angular_components',
    descriptionKey: 'TOPIC_DESC_angular_components',
    codeSnippets: [
      {
        language: 'typescript',
        code: `@Component({
  selector: 'app-user-card',
  standalone: true,
  template: \`<div>{{ user.name }}</div>\`,
  styles: [\`.name { font-weight: bold; }\`]
})
export class UserCardComponent {
  @Input() user!: User;
  @Output() selected = new EventEmitter<User>();
}`
      },
      {
        language: 'html',
        code: `<!-- Using the component -->
<app-user-card
  [user]="currentUser"
  (selected)="onSelect($event)">
</app-user-card>`
      }
    ]
  },
  [key('angular', 'routing')]: {
    titleKey: 'NAV_SUB_angular_routing',
    descriptionKey: 'TOPIC_DESC_angular_routing',
    codeSnippets: [
      {
        language: 'typescript',
        code: `const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'user/:id', component: UserDetailComponent },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}`
      },
      {
        language: 'html',
        code: `<!-- Template: links and outlet -->
<nav>
  <a routerLink="/home" routerLinkActive="active">Home</a>
  <a [routerLink]="['/user', userId]">Profile</a>
</nav>
<router-outlet></router-outlet>`
      }
    ]
  },
  [key('angular', 'forms')]: {
    titleKey: 'NAV_SUB_angular_forms',
    descriptionKey: 'TOPIC_DESC_angular_forms',
    codeSnippets: [
      {
        language: 'typescript',
        code: `// Reactive form
form = new FormGroup({
  email: new FormControl('', [Validators.required, Validators.email]),
  password: new FormControl('', Validators.minLength(8))
});

onSubmit() {
  if (this.form.valid) {
    console.log(this.form.value);
  }
}`
      },
      {
        language: 'html',
        code: `<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input formControlName="email" type="email" />
  <input formControlName="password" type="password" />
  <button type="submit" [disabled]="form.invalid">Submit</button>
</form>`
      }
    ]
  },
  [key('scss', 'variables')]: {
    titleKey: 'NAV_SUB_scss_variables',
    descriptionKey: 'TOPIC_DESC_scss_variables',
    codeSnippets: [
      {
        language: 'scss',
        code: `$primary: #1976d2;
$spacing-unit: 8px;
$font-base: 16px;

.button {
  background: $primary;
  padding: $spacing-unit * 2;
  font-size: $font-base;
}`
      }
    ]
  },
  [key('scss', 'mixins')]: {
    titleKey: 'NAV_SUB_scss_mixins',
    descriptionKey: 'TOPIC_DESC_scss_mixins',
    codeSnippets: [
      {
        language: 'scss',
        code: `@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin respond-to($breakpoint) {
  @media (min-width: $breakpoint) {
    @content;
  }
}

.card {
  @include flex-center;
  @include respond-to(768px) { padding: 1rem; }
}`
      }
    ]
  },
  [key('scss', 'nesting')]: {
    titleKey: 'NAV_SUB_scss_nesting',
    descriptionKey: 'TOPIC_DESC_scss_nesting',
    codeSnippets: [
      {
        language: 'scss',
        code: `.nav {
  list-style: none;
  li {
    display: inline-block;
    a {
      color: blue;
      &:hover { text-decoration: underline; }
    }
  }
}` 
      }
    ]
  },
  [key('html', 'semantics')]: {
    titleKey: 'NAV_SUB_html_semantics',
    descriptionKey: 'TOPIC_DESC_html_semantics',
    codeSnippets: [
      {
        language: 'html',
        code: `<article>
  <header>
    <h1>Article title</h1>
    <time datetime="2025-02-14">Feb 14, 2025</time>
  </header>
  <section>
    <p>First paragraph...</p>
  </section>
  <footer>
    <small>Author name</small>
  </footer>
</article>`
      }
    ]
  },
  [key('html', 'forms')]: {
    titleKey: 'NAV_SUB_html_forms',
    descriptionKey: 'TOPIC_DESC_html_forms',
    codeSnippets: [
      {
        language: 'html',
        code: `<form action="/submit" method="post">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required />
  <label for="pwd">Password</label>
  <input id="pwd" name="pwd" type="password" minlength="8" />
  <button type="submit">Sign in</button>
</form>`
      }
    ]
  },
  [key('html', 'a11y')]: {
    titleKey: 'NAV_SUB_html_a11y',
    descriptionKey: 'TOPIC_DESC_html_a11y',
    codeSnippets: [
      {
        language: 'html',
        code: `<!-- Label + input -->
<label for="search">Search</label>
<input id="search" type="search" aria-describedby="search-hint" />
<span id="search-hint">Enter at least 2 characters</span>

<!-- Button with accessible name -->
<button type="button" aria-label="Close dialog" (click)="close()">
  <span aria-hidden="true">&times;</span>
</button>`
      }
    ]
  },
  [key('rxjs', 'observables')]: {
    titleKey: 'NAV_SUB_rxjs_observables',
    descriptionKey: 'TOPIC_DESC_rxjs_observables',
    codeSnippets: [
      {
        language: 'typescript',
        code: `import { Observable } from 'rxjs';

const numbers$ = new Observable<number>(subscriber => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.next(3);
  subscriber.complete();
});

numbers$.subscribe(value => console.log(value));
// 1, 2, 3`
      },
      {
        language: 'typescript',
        code: `import { of } from 'rxjs';

const items$ = of('a', 'b', 'c');
items$.subscribe(x => console.log(x));`
      }
    ]
  },
  [key('rxjs', 'operators')]: {
    titleKey: 'NAV_SUB_rxjs_operators',
    descriptionKey: 'TOPIC_DESC_rxjs_operators',
    codeSnippets: [
      {
        language: 'typescript',
        code: `import { map, filter } from 'rxjs/operators';

source$.pipe(
  filter(x => x > 0),
  map(x => x * 2)
).subscribe(result => console.log(result));`
      },
      {
        language: 'typescript',
        code: `import { switchMap } from 'rxjs/operators';

this.route.params.pipe(
  switchMap(params => this.api.getUser(params['id']))
).subscribe(user => this.user = user);`
      }
    ]
  },
  [key('rxjs', 'subjects')]: {
    titleKey: 'NAV_SUB_rxjs_subjects',
    descriptionKey: 'TOPIC_DESC_rxjs_subjects',
    codeSnippets: [
      {
        language: 'typescript',
        code: `import { Subject } from 'rxjs';

const bus = new Subject<string>();
bus.subscribe(msg => console.log(msg));
bus.next('hello');
bus.next('world');
bus.complete();`
      },
      {
        language: 'typescript',
        code: `// BehaviorSubject: current value + stream
const state = new BehaviorSubject<number>(0);
state.subscribe(v => console.log(v)); // 0
state.next(1);  // logs 1
console.log(state.getValue()); // 1`
      }
    ]
  },
  [key('ngrx', 'store')]: {
    titleKey: 'NAV_SUB_ngrx_store',
    descriptionKey: 'TOPIC_DESC_ngrx_store',
    codeSnippets: [
      {
        language: 'typescript',
        code: `// Store setup
export interface AppState {
  user: UserState;
  items: ItemState;
}

export const reducers: ActionReducerMap<AppState> = {
  user: userReducer,
  items: itemsReducer
};

// In component
constructor(private store: Store<AppState>) {}
user$ = this.store.select(selectCurrentUser);`
      }
    ]
  },
  [key('ngrx', 'actions')]: {
    titleKey: 'NAV_SUB_ngrx_actions',
    descriptionKey: 'TOPIC_DESC_ngrx_actions',
    codeSnippets: [
      {
        language: 'typescript',
        code: `// Actions
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction(
  '[Users] Load Success',
  props<{ users: User[] }>()
);

// Reducer
const userReducer = createReducer(
  initialState,
  on(loadUsersSuccess, (state, { users }) => ({ ...state, users }))
);`
      },
      {
        language: 'typescript',
        code: `// Dispatching
this.store.dispatch(loadUsers());`
      }
    ]
  },
  [key('ngrx', 'effects')]: {
    titleKey: 'NAV_SUB_ngrx_effects',
    descriptionKey: 'TOPIC_DESC_ngrx_effects',
    codeSnippets: [
      {
        language: 'typescript',
        code: `@Injectable()
export class UserEffects {
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsers),
      switchMap(() =>
        this.api.getUsers().pipe(
          map(users => loadUsersSuccess({ users })),
          catchError(err => of(loadUsersFailure({ error: err })))
        )
      )
    )
  );
  constructor(private actions$: Actions, private api: UserApi) {}
}`
      }
    ]
  }
};
