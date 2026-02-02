// Quick test to debug LinkedIn Page Statistics 403
import { decryptToken } from './lib/utils/token-encryption'

const ENCRYPTED_TOKEN = '7/SK96CAAnpVRlRGK5qZCjwlNNSAgJhcgZbL5NxmHecrxI2lcGax0nYuDyoIhU8u8gQQs+nEZxEhF4c0tZLfdOvIV9sU05QyVNQl3zWfzBilcIKQZ7hltlIebCeA1mFZZ7CbHIMaDaftmax+pHj82L+QOk8JXHTA2gZAwNxdiRyl2UY4pGBRu/wD2pbN5bzVZYhqlEmk38eXAsZPYRatyDmAA7Yun+YQxNyoKmlTOZB2N8GVcGfSJAD4DuubTuxedJMij2IbUtMug+auZvjCljZwI9MOo3NlrCFUFFw+pSQx0WUc+WJIKbHZgLbNtDNWMM75Cf97KcLBbyliqUuNjEbKK68ZaBtGclYI0jqzVKJtLT3gTmUlEg+rEqSFM/zE/hbiYDkuftnsE2LIsg/3x2is40Ss6WPdegTaz1J4PJhDtcGbIcUBPdNEF7j1eplz/M+fDH6aViJ9lloPXZxyHhm1/6G9ZwpqJl2HmgGAcr2wU9NTousB8xYKySP0kcJ2uyLYq5E5mUPETnzBJHxh47AIJg5C06R1ZqWILs8HElZPinHgBnBkq5KF3bTrNp8y6figGWHy1XT7UWAkXBs='
const ORG_ID = '21579434' // Bytecurve

async function testLinkedInAPI() {
  console.log('Decrypting token...')
  const accessToken = decryptToken(ENCRYPTED_TOKEN)
  console.log('Token decrypted, first 20 chars:', accessToken.substring(0, 20))
  
  const endpoints = [
    // Follower stats (should work)
    `https://api.linkedin.com/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${ORG_ID}`,
    // Page stats (403)
    `https://api.linkedin.com/rest/organizationPageStatistics?q=organization&organization=urn:li:organization:${ORG_ID}`,
    // Try v2 API instead
    `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=urn:li:organization:${ORG_ID}`,
  ]

  for (const url of endpoints) {
    console.log('\n---Testing:', url)
    try {
      // Try without version header
      const response1 = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        }
      })
      console.log('No version header:', response1.status, await response1.text().then(t => t.substring(0, 200)))

      // Try with version header
      const response2 = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202401', // Try a valid past version
        }
      })
      console.log('With 202401:', response2.status, await response2.text().then(t => t.substring(0, 200)))
    } catch (err) {
      console.error('Error:', err)
    }
  }
}

testLinkedInAPI()
