<script context="module" lang="ts">
  import { Request, Response } from "@serverless-toolkit/sdk";

  export const title = "Set cookies";

  export async function load(request: Request, response: Response) {
    response.cookies = [
      "my_cookie=HelloWorld; Path=/; Expires=Wed, 15 Mar 2030 15:59:59 GMT",
    ];
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

# {title}

<style>
</style>
