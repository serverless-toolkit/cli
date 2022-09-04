<script context="module" lang="ts">
  import { Request } from "@serverless-toolkit/sdk";

  export const title = "File upload";
  export let content = "";
  export let contentType = "";

  export async function post({ body }: Request) {
    const [uploaded] = body?.files || [];
    contentType = uploaded?.contentType || "";
    content = uploaded?.content || "";

    content = contentType?.includes("image")
      ? `data:${contentType};base64,${Buffer.from(content, "base64").toString(
          "base64"
        )}`
      : Buffer.from(content).toString();
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<h1>{title}</h1>

**Choose a image or txt file (limit 6MB)**

<form method="post" enctype="multipart/form-data">
  <input type="file" name="file" required /><br />
  <input type="submit" value="Upload" />
</form>

<div>
  Content-Type: {contentType}
  <div class="content">
    {#if contentType?.includes("image")}
      <img src={content} alt="" />
    {:else if contentType === "text/plain"}
      <pre>
        <code>{content}</code>
	  </pre>
    {/if}
  </div>
</div>

<style>
  .content {
    padding: 10px;
  }
</style>
