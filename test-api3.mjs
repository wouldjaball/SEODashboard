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
  const urn = encodeURIComponent(`urn:li:organization:${ORG_ID}`)
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
  }

  // Test all relevant v2 endpoints
  const endpoints = [
    ['Follower Stats', `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${urn}`],
    ['Page Stats', `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=${urn}`],
    ['Follower Demographics', `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${urn}&segments=List(function,seniority,industry,geo,staffCountRange)`],
  ]

  for (const [name, url] of endpoints) {
    console.log(`\n=== ${name} ===`)
    console.log('URL:', url.substring(0, 100) + '...')
    const r = await fetch(url, { headers })
    console.log('Status:', r.status)
    const t = await r.text()
    if (r.ok) {
      const json = JSON.parse(t)
      console.log('Elements:', json.elements?.length || 0)
      console.log('Sample:', JSON.stringify(json).substring(0, 300) + '...')
    } else {
      console.log('Error:', t.substring(0, 200))
    }
  }
}

test().catch(console.error)
