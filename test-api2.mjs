import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

const ENCRYPTION_KEY = 'bb4459589152ede4cf631961f6fcc6f670538ff6e9966cb23ee852c230822cbb'
const ENCRYPTED_TOKEN = '7/SK96CAAnpVRlRGK5qZCjwlNNSAgJhcgZbL5NxmHecrxI2lcGax0nYuDyoIhU8u8gQQs+nEZxEhF4c0tZLfdOvIV9sU05QyVNQl3zWfzBilcIKQZ7hltlIebCeA1mFZZ7CbHIMaDaftmax+pHj82L+QOk8JXHTA2gZAwNxdiRyl2UY4pGBRu/wD2pbN5bzVZYhqlEmk38eXAsZPYRatyDmAA7Yun+YQxNyoKmlTOZB2N8GVcGfSJAD4DuubTuxedJMij2IbUtMug+auZvjCljZwI9MOo3NlrCFUFFw+pSQx0WUc+WJIKbHZgLbNtDNWMM75Cf97KcLBbyliqUuNjEbKK68ZaBtGclYI0jqzVKJtLT3gTmUlEg+rEqSFM/zE/hbiYDkuftnsE2LIsg/3x2is40Ss6WPdegTaz1J4PJhDtcGbIcUBPdNEF7j1eplz/M+fDH6aViJ9lloPXZxyHhm1/6G9ZwpqJl2HmgGAcr2wU9NTousB8xYKySP0kcJ2uyLYq5E5mUPETnzBJHxh47AIJg5C06R1ZqWILs8HElZPinHgBnBkq5KF3bTrNp8y6figGWHy1XT7UWAkXBs='
const ORG_ID = '21579434'

function decryptToken(encryptedText) {
  const data = Buffer.from(encryptedText, 'base64')
  const salt = data.subarray(0, SALT_LENGTH)
  const iv = data.subarray(SALT_LENGTH, TAG_POSITION)
  const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION)
  const encrypted = data.subarray(ENCRYPTED_POSITION)
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

async function test() {
  const accessToken = decryptToken(ENCRYPTED_TOKEN)
  console.log('Token decrypted OK')

  // Test with URL-encoded URN
  console.log('\n=== Test: Page Stats - URL encoded URN ===')
  const urn = encodeURIComponent(`urn:li:organization:${ORG_ID}`)
  const url = `https://api.linkedin.com/rest/organizationPageStatistics?q=organization&organization=${urn}`
  console.log('URL:', url)
  const r = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401',
    }
  })
  console.log('Status:', r.status)
  const t = await r.text()
  console.log('Response:', t.substring(0, 500))

  // Test follower stats with encoded URN
  console.log('\n=== Test: Follower Stats - URL encoded URN ===')
  const fUrl = `https://api.linkedin.com/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${urn}`
  console.log('URL:', fUrl)
  const r2 = await fetch(fUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401',
    }
  })
  console.log('Status:', r2.status)
  const t2 = await r2.text()
  console.log('Response:', t2.substring(0, 500))

  // Test v2 with encoded URN
  console.log('\n=== Test: Page Stats v2 - URL encoded ===')
  const v2Url = `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=${urn}`
  const r3 = await fetch(v2Url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    }
  })
  console.log('Status:', r3.status)
  const t3 = await r3.text()
  console.log('Response:', t3.substring(0, 500))
}

test().catch(console.error)
