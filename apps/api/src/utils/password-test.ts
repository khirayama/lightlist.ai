import crypto from 'crypto';

/**
 * テスト用軽量パスワードハッシュユーティリティ
 * bcryptの代わりにsha256を使用して高速化
 */

const SALT_PREFIX = 'test_salt_';

/**
 * テスト用軽量ハッシュ関数
 */
export function fastHashPassword(password: string): Promise<string> {
  return new Promise((resolve) => {
    // 固定ソルトでsha256ハッシュを生成（テスト用）
    const salt = SALT_PREFIX + 'fixed_for_testing';
    const hash = crypto.createHash('sha256');
    hash.update(password + salt);
    const hashedPassword = `$test$${salt}$${hash.digest('hex')}`;
    resolve(hashedPassword);
  });
}

/**
 * テスト用軽量検証関数
 */
export function fastVerifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // ハッシュ形式の検証
      if (!hashedPassword.startsWith('$test$')) {
        resolve(false);
        return;
      }

      const parts = hashedPassword.split('$');
      if (parts.length !== 4) {
        resolve(false);
        return;
      }

      const [, , salt, expectedHash] = parts;
      
      if (!salt || !expectedHash) {
        resolve(false);
        return;
      }
      
      // 入力パスワードのハッシュを計算
      const hash = crypto.createHash('sha256');
      hash.update(password + salt);
      const computedHash = hash.digest('hex');
      
      // 定数時間比較
      resolve(crypto.timingSafeEqual(
        Buffer.from(expectedHash, 'hex'),
        Buffer.from(computedHash, 'hex')
      ));
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * テスト用事前計算済みハッシュ
 * 頻繁に使用されるパスワードの事前計算済みハッシュ
 */
export const PRE_COMPUTED_HASHES = {
  'TestPass123': '$test$test_salt_fixed_for_testing$9f8e88c4965fa7f134c3b66bf0bd2064d815a3e6cedb4bea6e9341ca7a9d7ed4',
  'ValidPass456': '$test$test_salt_fixed_for_testing$e6c53567e6865a6b34d63edd2c5e1a3eedfe71191d608d3ee64bf453efe69857',
  'SecurePassword789': '$test$test_salt_fixed_for_testing$7288fc8ae932a9bdb7d5e8e1c38cc92c5e3e6f87a04c6fc55cc00f24007d6486',
  'weak': '$test$test_salt_fixed_for_testing$be05955939a921e2ac2b7b184f74c23ef4fdeda0c4d7a76bfabf6823442716e6',
  'password': '$test$test_salt_fixed_for_testing$9e8d6ab4280c8a182b8b340ac7e6eb0c0602edb7305d67112f6afd81571ee3d8',
  '': '$test$test_salt_fixed_for_testing$01dd720cf768f039889345ad41195bf0e442832d79ef504107306ca3de11a111'
};

/**
 * 事前計算済みハッシュの取得
 */
export function getPreComputedHash(password: string): string | null {
  return PRE_COMPUTED_HASHES[password as keyof typeof PRE_COMPUTED_HASHES] || null;
}

/**
 * テスト用高速ハッシュ（事前計算済みハッシュを優先使用）
 */
export async function optimizedTestHashPassword(password: string): Promise<string> {
  const preComputed = getPreComputedHash(password);
  if (preComputed) {
    return preComputed;
  }
  return fastHashPassword(password);
}

/**
 * テスト用高速検証（事前計算済みハッシュを考慮）
 */
export async function optimizedTestVerifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const preComputed = getPreComputedHash(password);
  if (preComputed) {
    return preComputed === hashedPassword;
  }
  return fastVerifyPassword(password, hashedPassword);
}