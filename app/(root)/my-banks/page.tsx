import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox';
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const MyBanks = async () => {
  // 1) LẤY USER
  let loggedIn;
  try {
    loggedIn = await getLoggedInUser();
  } catch {
    loggedIn = { status: "network_error", user: null };
  }

  const user = loggedIn?.user;

  // Nếu user lỗi → DỪNG TẠI ĐÂY, KHÔNG GỌI BANKS
  if (!user) {
    return (
      <section className="flex">
        <div className="my-banks">
          <HeaderBox
            title="My Bank Accounts"
            subtext="Effortlessly manage your banking activities"
          />
          <p className="text-red-500 mt-4">
            Không thể tải dữ liệu. Vui lòng thử lại.
          </p>
        </div>
      </section>
    );
  }

  // 2) GET BANK ACCOUNTS
  let accountsResult;
  try {
    accountsResult = await getAccounts({ userId: user.$id });
  } catch {
    accountsResult = { status: "network_error", data: null };
  }

  const errorAccounts = accountsResult.status !== "ok";
  const accounts = accountsResult?.data ?? [];

  return (
    <section className="flex">
      <div className="my-banks">
        <HeaderBox
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activities"
        />

        {/* Nếu bank bị lỗi */}
        {errorAccounts && (
          <p className="text-red-500 text-sm mt-2">
            Lỗi kết nối khi tải danh sách ngân hàng. Vui lòng thử lại.
          </p>
        )}

        {/* Không lỗi + không bank */}
        {!errorAccounts && accounts.length === 0 && (
          <p className="text-gray-500 text-sm">
            Bạn chưa kết nối ngân hàng nào.
          </p>
        )}

        {/* Thành công + có data */}
        {!errorAccounts && accounts.length > 0 && (
          <div className="flex flex-wrap gap-6">
            {accounts.map((a: Account) => (
              <BankCard
                key={a.id}
                account={a}
                userName={user.firstName}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MyBanks;
