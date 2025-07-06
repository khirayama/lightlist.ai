import { 
  CollaborativeSession, 
  CollaborativeState, 
  TaskList, 
  Task, 
  ApiResponse 
} from '../types';
import { ServiceBase } from './base/service-base';
import { HttpClient } from './base/http-client';

export class CollaborativeServiceImpl extends ServiceBase {
  constructor(
    httpClient: HttpClient
  ) {
    super(httpClient);
  }

  // セッション管理
  async startSession(taskListId: string, sessionType: 'active' | 'background'): Promise<ApiResponse<CollaborativeSession>> {
    try {
      // バリデーション
      this.validatePathParam(taskListId, 'taskListId');
      this.validateSessionType(sessionType);

      const response = await this.httpClient.post<CollaborativeSession>(
        `/collaborative/sessions/${taskListId}`,
        { sessionType }
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getState(taskListId: string): Promise<ApiResponse<CollaborativeState>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');

      const response = await this.httpClient.get<CollaborativeState>(
        `/collaborative/sessions/${taskListId}`
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async sendUpdate(taskListId: string, update: string): Promise<ApiResponse<{ stateVector: string }>> {
    try {
      // バリデーション
      this.validatePathParam(taskListId, 'taskListId');
      this.validateUpdateData(update);

      const response = await this.httpClient.put<{ stateVector: string }>(
        `/collaborative/sessions/${taskListId}`,
        { update }
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async maintainSession(taskListId: string): Promise<ApiResponse<void>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');

      const response = await this.httpClient.patch<void>(
        `/collaborative/sessions/${taskListId}`
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async endSession(taskListId: string): Promise<ApiResponse<void>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');

      const response = await this.httpClient.delete<void>(
        `/collaborative/sessions/${taskListId}`
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  // 初期データ読み込み
  async getTaskLists(): Promise<ApiResponse<TaskList[]>> {
    try {
      const response = await this.httpClient.get<TaskList[]>('/tasklists');
      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async initializeTaskList(taskListId: string): Promise<ApiResponse<TaskList>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');

      const response = await this.httpClient.get<TaskList>(
        `/tasklists/${taskListId}`
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Y.js操作ヘルパー
  async createTaskListDocument(taskList: Partial<TaskList>): Promise<ApiResponse<TaskList>> {
    try {
      // バリデーション
      this.validateTaskListData(taskList);

      const response = await this.httpClient.post<TaskList>(
        '/tasklists',
        taskList
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateTaskListDocument(taskListId: string, updates: Partial<TaskList>): Promise<ApiResponse<void>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');
      this.validateTaskListUpdates(updates);

      const response = await this.httpClient.put<void>(
        `/tasklists/${taskListId}`,
        updates
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteTaskListDocument(taskListId: string): Promise<ApiResponse<void>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');

      const response = await this.httpClient.delete<void>(
        `/tasklists/${taskListId}`
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createTaskInDocument(taskListId: string, task: Partial<Task>): Promise<ApiResponse<Task>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');
      this.validateTaskData(task);

      const response = await this.httpClient.post<Task>(
        `/collaborative/taskLists/${taskListId}/tasks`,
        task
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateTaskInDocument(taskListId: string, taskId: string, updates: Partial<Task>): Promise<ApiResponse<void>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');
      this.validatePathParam(taskId, 'taskId');
      this.validateTaskUpdates(updates);

      const response = await this.httpClient.put<void>(
        `/collaborative/taskLists/${taskListId}/tasks/${taskId}`,
        updates
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteTaskInDocument(taskListId: string, taskId: string): Promise<ApiResponse<void>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');
      this.validatePathParam(taskId, 'taskId');

      const response = await this.httpClient.delete<void>(
        `/collaborative/taskLists/${taskListId}/tasks/${taskId}`
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  async moveTaskInDocument(taskListId: string, taskId: string, fromIndex: number, toIndex: number): Promise<ApiResponse<void>> {
    try {
      this.validatePathParam(taskListId, 'taskListId');
      this.validatePathParam(taskId, 'taskId');
      this.validateMoveIndices(fromIndex, toIndex);

      const response = await this.httpClient.patch<void>(
        `/collaborative/taskLists/${taskListId}/tasks/${taskId}/move`,
        { fromIndex, toIndex }
      );

      return response;
    } catch (error) {
      this.handleError(error);
    }
  }

  // プライベートメソッド（バリデーション）
  private validateSessionType(sessionType: string): void {
    const validTypes = ['active', 'background'];
    if (!validTypes.includes(sessionType)) {
      throw this.createError(
        'validation', 
        'INVALID_SESSION_TYPE', 
        `Invalid session type: ${sessionType}. Must be one of: ${validTypes.join(', ')}`
      );
    }
  }

  private validateUpdateData(update: string): void {
    if (!update || typeof update !== 'string' || update.trim() === '') {
      throw this.createError('validation', 'INVALID_UPDATE_DATA', 'Update data is required');
    }
  }

  private validateTaskListData(taskList: Partial<TaskList>): void {
    if (!taskList || typeof taskList !== 'object') {
      throw this.createError('validation', 'INVALID_TASK_LIST_DATA', 'TaskList data must be an object');
    }

    if (taskList.name !== undefined) {
      if (!taskList.name || typeof taskList.name !== 'string' || taskList.name.trim() === '') {
        throw this.createError('validation', 'INVALID_TASK_LIST_NAME', 'TaskList name is required');
      }
    }

    if (taskList.background !== undefined) {
      this.validateColor(taskList.background);
    }
  }

  private validateTaskListUpdates(updates: Partial<TaskList>): void {
    if (!updates || typeof updates !== 'object') {
      throw this.createError('validation', 'INVALID_TASK_LIST_UPDATES', 'TaskList updates must be an object');
    }

    if (updates.name !== undefined) {
      if (!updates.name || typeof updates.name !== 'string' || updates.name.trim() === '') {
        throw this.createError('validation', 'INVALID_TASK_LIST_NAME', 'TaskList name cannot be empty');
      }
    }

    if (updates.background !== undefined) {
      this.validateColor(updates.background);
    }
  }

  private validateTaskData(task: Partial<Task>): void {
    if (!task || typeof task !== 'object') {
      throw this.createError('validation', 'INVALID_TASK_DATA', 'Task data must be an object');
    }

    if (task.text !== undefined) {
      if (!task.text || typeof task.text !== 'string' || task.text.trim() === '') {
        throw this.createError('validation', 'INVALID_TASK_TEXT', 'Task text is required');
      }
    }

    if (task.completed !== undefined && typeof task.completed !== 'boolean') {
      throw this.createError('validation', 'INVALID_TASK_COMPLETED', 'Task completed must be a boolean');
    }

    if (task.date !== undefined) {
      this.validateDate(task.date);
    }
  }

  private validateTaskUpdates(updates: Partial<Task>): void {
    if (!updates || typeof updates !== 'object') {
      throw this.createError('validation', 'INVALID_TASK_UPDATES', 'Task updates must be an object');
    }

    if (updates.text !== undefined) {
      if (!updates.text || typeof updates.text !== 'string' || updates.text.trim() === '') {
        throw this.createError('validation', 'INVALID_TASK_TEXT', 'Task text cannot be empty');
      }
    }

    if (updates.completed !== undefined && typeof updates.completed !== 'boolean') {
      throw this.createError('validation', 'INVALID_TASK_COMPLETED', 'Task completed must be a boolean');
    }

    if (updates.date !== undefined) {
      this.validateDate(updates.date);
    }
  }

  private validateMoveIndices(fromIndex: number, toIndex: number): void {
    if (typeof fromIndex !== 'number' || fromIndex < 0 || !Number.isInteger(fromIndex)) {
      throw this.createError('validation', 'INVALID_FROM_INDEX', 'From index must be a non-negative integer');
    }

    if (typeof toIndex !== 'number' || toIndex < 0 || !Number.isInteger(toIndex)) {
      throw this.createError('validation', 'INVALID_TO_INDEX', 'To index must be a non-negative integer');
    }
  }

  private validateColor(color: string): void {
    if (!color || typeof color !== 'string') {
      throw this.createError('validation', 'INVALID_COLOR', 'Color must be a string');
    }

    // 基本的な色の形式チェック（#RRGGBB）
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(color)) {
      throw this.createError('validation', 'INVALID_COLOR_FORMAT', 'Color must be in #RRGGBB format');
    }
  }

  private validateDate(date: string): void {
    if (!date || typeof date !== 'string') {
      throw this.createError('validation', 'INVALID_DATE', 'Date must be a string');
    }

    // ISO 8601 date format validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw this.createError('validation', 'INVALID_DATE_FORMAT', 'Date must be in YYYY-MM-DD format');
    }

    // Check if date is valid
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw this.createError('validation', 'INVALID_DATE_VALUE', 'Invalid date value');
    }
  }
}