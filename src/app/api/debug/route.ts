import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authStore = request.headers.get('authorization') || 'no-auth'
  const userAgent = request.headers.get('user-agent') || 'no-ua'
  
  return NextResponse.json({
    message: 'Debug endpoint',
    headers: {
      authorization: authStore,
      userAgent: userAgent.substring(0, 50)
    },
    timestamp: new Date().toISOString()
  })
}
