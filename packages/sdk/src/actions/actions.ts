import { Actions } from '../index';
import { AuthActionsImpl } from './auth-actions';
import { SettingsActionsImpl } from './settings-actions';
import { TaskListActionsImpl } from './tasklist-actions';
import { TaskActionsImpl } from './task-actions';
import { ShareActionsImpl } from './share-actions';
import { 
  AuthService, 
  SettingsService, 
  CollaborativeService, 
  ShareService 
} from '../services';
import { Store } from '../store';

export class ActionsImpl implements Actions {
  public readonly auth: AuthActionsImpl;
  public readonly settings: SettingsActionsImpl;
  public readonly taskLists: TaskListActionsImpl;
  public readonly tasks: TaskActionsImpl;
  public readonly share: ShareActionsImpl;

  constructor(
    authService: AuthService,
    settingsService: SettingsService,
    collaborativeService: CollaborativeService,
    shareService: ShareService,
    store: Store
  ) {
    // 各Actionsクラスのインスタンスを作成
    this.auth = new AuthActionsImpl(authService, settingsService, store);
    this.settings = new SettingsActionsImpl(settingsService, store);
    this.taskLists = new TaskListActionsImpl(collaborativeService, settingsService, store);
    this.tasks = new TaskActionsImpl(collaborativeService, store);
    this.share = new ShareActionsImpl(shareService, store);
  }
}