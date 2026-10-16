import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

const getMessage = (error: unknown): string => {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  if (error instanceof Error) return error.message
  return '页面加载失败，请稍后重试。'
}

function RouteErrorBoundary() {
  const error = useRouteError()

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">应用异常</h1>
        <p className="mt-2 text-sm text-muted-foreground break-all">{getMessage(error)}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          刷新页面
        </button>
      </div>
    </div>
  )
}

export default RouteErrorBoundary
