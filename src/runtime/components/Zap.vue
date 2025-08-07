<script setup lang="ts">
const props = withDefaults(defineProps<{ title?: string }>(), { title: 'Zap' })
const open = ref(false)
const amount = ref<number | null>(null)
const comment = ref('')
const sending = ref(false)
const result = ref<string | null>(null)
const error = ref<string | null>(null)

const { $zap } = useNuxtApp()

async function onSend() {
  error.value = null
  result.value = null
  sending.value = true
  try {
    const res = await $zap.send(amount.value ?? undefined, comment.value || undefined)
    result.value = `Paid invoice. Preimage: ${res?.preimage || 'n/a'}`
    open.value = false
  }
  catch (e: any) {
    error.value = e?.message || String(e)
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton color="primary" :loading="sending" :disabled="sending">
      <Icon name="clarity:lightning-solid" />
      {{ props.title }}
    </UButton>
    <template #content>
      <div class="m-2 p-3 bg-gray-50 rounded shadow min-w-64">
        <div class="space-y-2">
          <UFormField  label="Amount (sats)">
            <UInput v-model.number="amount" type="number" min="1" placeholder="e.g. 21" />
          </UFormField>
          <UFormField  label="Comment">
            <UInput v-model="comment" placeholder="optional message" />
          </UFormField>
          <div class="flex gap-2 items-center">
            <UButton color="primary" @click="onSend" :loading="sending">Send Zap</UButton>
            <span v-if="error" class="text-red-600 text-sm">{{ error }}</span>
            <span v-else-if="result" class="text-green-700 text-sm">{{ result }}</span>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<style scoped>
</style>
