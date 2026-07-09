import ResetForm from "@/components/ResetForm";

// /reset/[token] — landing page of a password-reset link issued by
// /api/auth/forgot. The token is only validated on submit, so this page
// renders the same whether or not the link is still good.
export default function ResetPage({ params }: { params: { token: string } }) {
  return <ResetForm token={params.token} />;
}
