import { useState } from 'react';

export default function HomePage() {
  return (
    <div>
      <h1>LightList SDK Sample App</h1>
      <p>SDK動作確認用サンプルアプリです。</p>
      
      <nav>
        <ul>
          <li><a href="/register">ユーザー登録</a></li>
          <li><a href="/login">ログイン</a></li>
          <li><a href="/forgot-password">パスワードリセット</a></li>
          <li><a href="/settings">設定</a></li>
        </ul>
      </nav>
      
      <div>
        <h2>タスクリスト</h2>
        <p>ログイン後にタスクリストが表示されます。</p>
      </div>
    </div>
  );
}