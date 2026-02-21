import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-topics-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './topics-shell.html',
  styleUrl: './topics-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopicsShell {}
