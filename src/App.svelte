<script>
  import TweetForm from "./TweetForm.svelte";
</script>

<svelte:window />
<div class="main">
  <div class="title">Click to tweet generator (v1.1)</div>
  <TweetForm />
</div>

<style>
  .title {
    color: #1da1f2;
    font-size: 36px;
    font-weight: 600;
  }

  .main {
    padding: 50px;
  }
</style>
