export default function LogoutForm() {
  return (
    <form action="/api/auth/logout" method="post">
      <button>Logout</button>
    </form>
  )
}
