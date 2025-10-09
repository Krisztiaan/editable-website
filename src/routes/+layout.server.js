export async function load({ locals }) {
  return {
    currentUser: locals.user
  };
}

