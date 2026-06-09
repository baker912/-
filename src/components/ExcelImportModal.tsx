import React, { useMemo, useState } from 'react';
import { Modal, Upload, Typography, Alert, Space, List } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { InboxOutlined } from '@ant-design/icons';
import { parseTemplateSheets, readWorkbook } from '../lib/excelImport';

export type ExcelImportModalProps = {
  open: boolean;
  title: string;
  sheetNames: string[];
  onClose: () => void;
  onImport: (dataBySheet: Record<string, any[]>) => Promise<void>;
};

export default function ExcelImportModal(props: ExcelImportModalProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<Record<string, any[]> | null>(null);
  const [parseError, setParseError] = useState<string>('');

  const rowsCount = useMemo(() => {
    if (!parsed) return 0;
    return Object.values(parsed).reduce((sum, rows) => sum + (rows?.length || 0), 0);
  }, [parsed]);

  const handleParse = async (file: File) => {
    setParseError('');
    setParsed(null);
    try {
      const wb = await readWorkbook(file);
      const data = parseTemplateSheets(wb, props.sheetNames);
      setParsed(data);
    } catch (e: any) {
      setParseError(e?.message || '解析失败');
    }
  };

  return (
    <Modal
      title={props.title}
      open={props.open}
      confirmLoading={loading}
      okText="开始导入"
      cancelText="取消"
      onCancel={() => {
        if (loading) return;
        setFileList([]);
        setParsed(null);
        setParseError('');
        props.onClose();
      }}
      onOk={async () => {
        if (!parsed) return;
        setLoading(true);
        try {
          await props.onImport(parsed);
          setFileList([]);
          setParsed(null);
          setParseError('');
          props.onClose();
        } finally {
          setLoading(false);
        }
      }}
      okButtonProps={{ disabled: !parsed || rowsCount === 0 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Upload.Dragger
          multiple={false}
          accept=".xlsx,.xls"
          fileList={fileList}
          beforeUpload={(file) => {
            setFileList([file as any]);
            void handleParse(file as any);
            return false;
          }}
          onRemove={() => {
            setFileList([]);
            setParsed(null);
            setParseError('');
            return true;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 Excel 文件到这里</p>
          <p className="ant-upload-hint">请使用系统下载的导入模板（第一行是字段名）</p>
        </Upload.Dragger>

        {parseError ? <Alert type="error" showIcon message={parseError} /> : null}

        {parsed ? (
          <div>
            <Typography.Text>将导入：</Typography.Text>
            <List
              size="small"
              dataSource={Object.entries(parsed)}
              renderItem={([name, rows]) => (
                <List.Item>
                  <Typography.Text>{name}</Typography.Text>
                  <Typography.Text type="secondary">{rows?.length || 0} 行</Typography.Text>
                </List.Item>
              )}
            />
          </div>
        ) : null}
      </Space>
    </Modal>
  );
}

