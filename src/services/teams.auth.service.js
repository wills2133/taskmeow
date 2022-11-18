import * as microsoftTeams from "@microsoft/teams-js";
import * as msal from "@azure/msal-browser";

// An authentication service that uses the MSAL.js and Teams.js library to sign in users with
// their AAD account. This leverages the AAD v2 endpoint.
class TeamsAuthService {
  constructor() {
    // Initialize the Teams SDK
    microsoftTeams.initialize(() => {}, [
      "https://admin-local.teams.microsoft.net",
    ]);

    this.api =
      "api://4330-2001-4898-a000-9-c1e8-613d-8428-da57.ngrok.io/175df185-3845-4690-ae1e-74d72cafb213/access_as_user";

    this.app = new msal.PublicClientApplication({
      auth: {
        clientId: "175df185-3845-4690-ae1e-74d72cafb213",
        redirectUri: `${window.location.origin}/tab/v2/silent-end`,
        navigateToLoginRequestUrl: false,
      },
      cache: {
        cacheLocation: "localStorage",
      },
    });
  }

  isCallback() {
    return this.app.handleRedirectPromise().then((authResponse) => {
      if (authResponse) {
        this.app.setActiveAccount(authResponse.account);
        return true;
      } else {
        return false;
      }
    });
  }

  login() {
    if (!this.loginPromise) {
      this.loginPromise = new Promise((resolve, reject) => {
        // Start the login flow
        microsoftTeams.authentication.authenticate({
          url: `${window.location.origin}/tab/v2/silent-start`,
          width: 600,
          height: 535,
          successCallback: (response) => {
            console.log("Login succeeded:" + JSON.stringify(response));
            this.app.setActiveAccount(response.account);
            resolve(response.account);
          },
          failureCallback: (error) => {
            console.error("Login failed: " + JSON.stringify(error));
            this.loginPromise = null;
            reject(error);
          },
        });
      });
    }
    return this.loginPromise;
  }

  logout() {
    this.app.logout();
  }

  getUser() {
    let activeAccount = this.app.getActiveAccount();
    if (!activeAccount) {
      const allAccounts = this.app.getAllAccounts();
      if (allAccounts.length === 1) {
        this.app.setActiveAccount(allAccounts[0]);
        activeAccount = allAccounts[0];
      }
    }
    return Promise.resolve(activeAccount);
  }

  getToken() {
    return new Promise((resolve) => {
      microsoftTeams.getContext((context) => {
        resolve(context);
      });
    }).then((context) => {
      const domainHint =
        context.tid === "9188040d-6c67-4c5b-b112-36a304b66dad"
          ? "consumers"
          : "organizations";
      const param = {
        loginHint: context.loginHint,
        scopes: [this.api],
        extraQueryParameters: { domain_hint: domainHint },
      };
      console.log("-------context", window.location.hostname, context, param);
      return this.app
        .acquireTokenSilent(param)
        .then((response) => {
          console.log("Token refresh succeeded: ", response);
          return response.accessToken;
        })
        .catch((error) => {
          console.error("Token refresh failed: ", error);
          return Promise.reject(error);
        });
    });
  }
}

export default TeamsAuthService;
